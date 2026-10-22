// Регистрация телефонов для push-уведомлений (мобильное приложение)
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { isValidPushToken } = require('../push');

const router = express.Router();
const prisma = new PrismaClient();

// Не больше стольких телефонов на одного пользователя: старые удаляются
const MAX_TOKENS_PER_USER = 10;

router.use(authMiddleware);

// Сохранить токен устройства. Если телефоном раньше пользовался другой аккаунт,
// токен переходит к текущему.
router.post('/', async (req, res) => {
  try {
    const { token } = req.body || {};
    const platform = ['ios', 'android'].includes(req.body?.platform) ? req.body.platform : null;
    if (!isValidPushToken(token)) {
      return res.status(400).json({ error: 'Неверный токен уведомлений' });
    }

    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.userId, platform },
      create: { token, userId: req.userId, platform },
    });

    const extra = await prisma.pushToken.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      skip: MAX_TOKENS_PER_USER,
      select: { id: true },
    });
    if (extra.length) {
      await prisma.pushToken.deleteMany({ where: { id: { in: extra.map((t) => t.id) } } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка сохранения push-токена:', error);
    res.status(500).json({ error: 'Не удалось включить уведомления' });
  }
});

// Удалить токен (выход из аккаунта или отключение уведомлений)
router.delete('/', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (typeof token !== 'string') return res.status(400).json({ error: 'Нужен токен' });
    await prisma.pushToken.deleteMany({ where: { token, userId: req.userId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления push-токена:', error);
    res.status(500).json({ error: 'Не удалось отключить уведомления' });
  }
});

module.exports = router;
