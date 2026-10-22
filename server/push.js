// Push-уведомления в мобильное приложение через Expo Push Service.
// https://docs.expo.dev/push-notifications/sending-notifications/
//
// notify() ничего не ждёт и не бросает ошибок: если уведомление не ушло,
// основной запрос (заявка в друзья, приглашение) всё равно выполняется.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo принимает до 100 уведомлений за один запрос
const CHUNK_SIZE = 100;
const TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

const isValidPushToken = (token) => typeof token === 'string' && token.length <= 200 && TOKEN_RE.test(token);

async function sendChunk(messages) {
  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  // Необязательно: токен доступа Expo, если в аккаунте Expo включена защита отправки
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

  const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers, body: JSON.stringify(messages) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Expo Push ответил ${res.status}`);

  // Приложение удалено или токен устарел: убираем его, чтобы не слать впустую
  const stale = (body.data || [])
    .map((ticket, i) => (ticket.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter(Boolean);
  if (stale.length) await prisma.pushToken.deleteMany({ where: { token: { in: stale } } });
}

// userIds: кому отправить. message: { title, body, url } — url открывается в приложении по нажатию.
async function sendPush(userIds, { title, body, url }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;

  const tokens = await prisma.pushToken.findMany({ where: { userId: { in: ids } }, select: { token: true } });
  const messages = tokens.map(({ token }) => ({
    to: token,
    title,
    body,
    sound: 'default',
    data: url ? { url } : {},
  }));

  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    await sendChunk(messages.slice(i, i + CHUNK_SIZE));
  }
}

function notify(userIds, message) {
  sendPush(userIds, message).catch((error) => {
    console.error('Не удалось отправить push-уведомление:', error.message);
  });
}

// Ник пользователя для текста уведомления
async function usernameOf(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  return user?.username || 'Друг';
}

module.exports = { notify, sendPush, isValidPushToken, usernameOf };
