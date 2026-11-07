// «Посоветовать другу»: пользователь отправляет фильм или сериал одному или нескольким
// друзьям с короткой запиской. Получатель видит совет в уведомлениях и может добавить
// фильм в «Буду смотреть» или скрыть совет.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { cleanPosterUrl, isPositiveInt } = require('../security');
const { notify, usernameOf } = require('../push');

const router = express.Router();
const prisma = new PrismaClient();

const NOTE_MAX = 200;
const MAX_RECIPIENTS = 20;
// Сколько советов хранится у получателя: старые сверх лимита не показываем
const INBOX_LIMIT = 50;

// Не даём засыпать друзей советами
const sendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: 'Слишком много советов за час. Попробуйте позже.',
});

router.use(authMiddleware);

async function friendIdsOf(userId) {
  const rows = await prisma.friend.findMany({
    where: { status: 'accepted', OR: [{ userId }, { friendId: userId }] },
    select: { userId: true, friendId: true },
  });
  return new Set(rows.map((r) => (r.userId === userId ? r.friendId : r.userId)));
}

function cleanNote(value) {
  if (typeof value !== 'string') return null;
  const note = value.trim().replace(/\s+/g, ' ');
  return note ? note.slice(0, NOTE_MAX) : null;
}

// Входящие советы, новые сверху
router.get('/', async (req, res) => {
  try {
    const items = await prisma.recommendation.findMany({
      where: { toId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: INBOX_LIMIT,
      select: {
        id: true, tmdbId: true, mediaType: true, title: true, posterUrl: true,
        releaseYear: true, note: true, readAt: true, createdAt: true,
        from: { select: { id: true, username: true, avatar: true } },
      },
    });
    res.json(items);
  } catch (error) {
    console.error('Ошибка загрузки советов:', error);
    res.status(500).json({ error: 'Не удалось загрузить советы' });
  }
});

// Каким друзьям этот фильм уже советовали (чтобы не предлагать повторно)
router.get('/sent', async (req, res) => {
  try {
    const tmdbId = Number(req.query.tmdbId);
    const mediaType = req.query.mediaType === 'tv' ? 'tv' : 'movie';
    if (!isPositiveInt(tmdbId)) return res.status(400).json({ error: 'Неверный идентификатор фильма' });
    const rows = await prisma.recommendation.findMany({
      where: { fromId: req.userId, tmdbId, mediaType },
      select: { toId: true },
    });
    res.json(rows.map((r) => r.toId));
  } catch (error) {
    console.error('Ошибка загрузки отправленных советов:', error);
    res.status(500).json({ error: 'Не удалось загрузить данные' });
  }
});

// Посоветовать фильм друзьям
router.post('/', sendLimiter, async (req, res) => {
  try {
    const { tmdbId, title, posterUrl } = req.body || {};
    const mediaType = req.body?.mediaType === 'tv' ? 'tv' : 'movie';
    const toIds = Array.isArray(req.body?.toIds)
      ? [...new Set(req.body.toIds.filter((id) => typeof id === 'string'))]
      : [];

    if (!isPositiveInt(tmdbId)) return res.status(400).json({ error: 'Неверный идентификатор фильма' });
    if (typeof title !== 'string' || title.trim() === '' || title.length > 300) {
      return res.status(400).json({ error: 'Неверное название' });
    }
    if (toIds.length === 0) return res.status(400).json({ error: 'Выберите хотя бы одного друга' });
    if (toIds.length > MAX_RECIPIENTS) {
      return res.status(400).json({ error: `Можно выбрать не больше ${MAX_RECIPIENTS} друзей` });
    }

    // Советовать можно только подтверждённым друзьям
    const friends = await friendIdsOf(req.userId);
    const recipients = toIds.filter((id) => friends.has(id));
    if (recipients.length === 0) return res.status(403).json({ error: 'Советовать можно только друзьям' });

    const year = Number(req.body?.releaseYear);
    const releaseYear = Number.isInteger(year) && year >= 1870 && year <= 2100 ? year : null;
    const note = cleanNote(req.body?.note);

    const { count } = await prisma.recommendation.createMany({
      data: recipients.map((toId) => ({
        fromId: req.userId,
        toId,
        tmdbId,
        mediaType,
        title: title.trim(),
        posterUrl: cleanPosterUrl(posterUrl),
        releaseYear,
        note,
      })),
      // Тот же фильм тому же другу повторно не создаём
      skipDuplicates: true,
    });

    if (count > 0) {
      const name = await usernameOf(req.userId);
      notify(recipients, {
        title: `${name} советует посмотреть`,
        body: note ? `«${title.trim()}» — ${note}` : `«${title.trim()}»`,
        url: '/notifications',
      });
    }

    res.status(201).json({ sent: count, skipped: recipients.length - count });
  } catch (error) {
    console.error('Ошибка отправки совета:', error);
    res.status(500).json({ error: 'Не удалось отправить совет' });
  }
});

// Отметить все входящие советы прочитанными
router.post('/read', async (req, res) => {
  try {
    await prisma.recommendation.updateMany({
      where: { toId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка отметки советов:', error);
    res.status(500).json({ error: 'Не удалось обновить советы' });
  }
});

// Скрыть совет (только получатель)
router.delete('/:id', async (req, res) => {
  try {
    const { count } = await prisma.recommendation.deleteMany({
      where: { id: req.params.id, toId: req.userId },
    });
    if (count === 0) return res.status(404).json({ error: 'Совет не найден' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка удаления совета:', error);
    res.status(500).json({ error: 'Не удалось скрыть совет' });
  }
});

module.exports = router;
