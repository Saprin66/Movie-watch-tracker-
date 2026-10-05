const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'movie-grade-secret-key-2024';

// Middleware для проверки токена
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет токена' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// 1. ПОИСК ПОЛЬЗОВАТЕЛЕЙ (должен быть ДО /:userId)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } }
        ],
        NOT: { id: req.userId }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        _count: { select: { movies: true } }
      },
      take: 10
    });
    res.json(users);
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. СПИСОК ДРУЗЕЙ
router.get('/friends/list', authMiddleware, async (req, res) => {
  try {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.userId, status: 'accepted' },
          { friendId: req.userId, status: 'accepted' }
        ]
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        friend: { select: { id: true, username: true, avatar: true } }
      }
    });

    const friends = friendships.map(f => f.userId === req.userId ? f.friend : f.user);
    res.json(friends);
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. ВХОДЯЩИЕ ЗАЯВКИ
router.get('/friends/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await prisma.friend.findMany({
      where: { friendId: req.userId, status: 'pending' },
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });
    res.json(requests.map(r => r.user));
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 4. ОБНОВИТЬ СВОЙ ПРОФИЛЬ
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { bio, avatar }
    });
    res.json({ message: 'Профиль обновлен', user });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 5. ПОЛУЧИТЬ ПРОФИЛЬ КОНКРЕТНОГО ПОЛЬЗОВАТЕЛЯ (/:userId должен быть в конце или после конкретных маршрутов)
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true,
        username: true,
        bio: true,
        avatar: true,
        createdAt: true,
        _count: { select: { movies: true } }
      }
    });

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Проверяем статус дружбы
    const friendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: user.id },
          { userId: user.id, friendId: req.userId }
        ]
      }
    });

    res.json({ ...user, friendshipStatus: friendship?.status || 'none' });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 6. ОТПРАВИТЬ ЗАЯВКУ В ДРУЗЬЯ
router.post('/:userId/friend-request', authMiddleware, async (req, res) => {
  try {
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Нельзя добавить себя' });
    }

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: req.params.userId },
          { userId: req.params.userId, friendId: req.userId }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Заявка уже существует' });
    }

    await prisma.friend.create({
      data: { userId: req.userId, friendId: req.params.userId, status: 'pending' }
    });

    res.json({ message: 'Заявка отправлена' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 7. ПРИНЯТЬ/ОТКЛОНИТЬ ЗАЯВКУ
router.put('/:userId/friend-request', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' или 'reject'

    const friendship = await prisma.friend.findFirst({
      where: { userId: req.params.userId, friendId: req.userId, status: 'pending' }
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (action === 'accept') {
      await prisma.friend.update({
        where: { id: friendship.id },
        data: { status: 'accepted' }
      });
    } else if (action === 'reject') {
      await prisma.friend.delete({ where: { id: friendship.id } });
    }

    res.json({ message: action === 'accept' ? 'Заявка принята' : 'Заявка отклонена' });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;