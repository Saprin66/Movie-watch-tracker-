const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../config');

const prisma = new PrismaClient();

// Обновляем lastSeen не чаще раза в минуту, чтобы не писать в БД на каждый запрос
const LAST_SEEN_THROTTLE_MS = 60 * 1000;

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Нет токена или неверный формат' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, lastSeen: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
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
    console.error('❌ Ошибка в authMiddleware:', error.message);
    res.status(401).json({ error: 'Недействительный или протухший токен' });
  }
};

module.exports = { authMiddleware };
