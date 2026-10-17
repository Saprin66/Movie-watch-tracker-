const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../config');

const prisma = new PrismaClient();

// Обновляем lastSeen не чаще раза в минуту, чтобы не писать в БД на каждый запрос
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

// Токены подписываются и проверяются только алгоритмом HS256
const JWT_OPTIONS = { algorithms: ['HS256'] };

const signToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

// Достаёт и проверяет токен из заголовка Authorization. Возвращает payload или null.
function readToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token || token.length > 2000) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, JWT_OPTIONS);
    return typeof decoded?.userId === 'string' ? decoded : null;
  } catch {
    return null;
  }
}

// allowUnverified: пускать пользователей с неподтверждённым email
// (нужно только для /api/auth/me и удаления аккаунта)
const createAuthMiddleware = ({ allowUnverified = false } = {}) => async (req, res, next) => {
  try {
    const decoded = readToken(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Недействительный или протухший токен' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, lastSeen: true, passwordChangedAt: true, isVerified: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Токены, выданные до смены пароля, больше не действуют
    if (
      user.passwordChangedAt &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return res.status(401).json({ error: 'Пароль был изменён. Войдите заново.' });
    }

    // Без подтверждённого email пользоваться сайтом нельзя: иначе можно было бы
    // регистрироваться на чужие адреса и рассылать заявки и приглашения
    if (!user.isVerified && !allowUnverified) {
      return res.status(403).json({ error: 'Подтвердите email, чтобы продолжить' });
    }

    if (!user.lastSeen || Date.now() - user.lastSeen.getTime() > LAST_SEEN_THROTTLE_MS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSeen: new Date() }
      });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Ошибка в authMiddleware:', error.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const authMiddleware = createAuthMiddleware();
const authAllowUnverified = createAuthMiddleware({ allowUnverified: true });

module.exports = { authMiddleware, authAllowUnverified, readToken, signToken };
