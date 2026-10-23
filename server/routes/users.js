const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { isValidAvatar } = require('../security');
const { notify, usernameOf } = require('../push');

const router = express.Router();
const prisma = new PrismaClient();

// 1. ПОИСК ПОЛЬЗОВАТЕЛЕЙ (должен быть ДО /:userId)
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim().slice(0, 50) : '';
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
    // Витрины фильмов больше нет: showcaseMovieIds от старых версий приложения молча игнорируем
    const { bio, avatar } = req.body || {};
    const data = {};

    if (bio !== undefined) {
      if (bio !== null && (typeof bio !== 'string' || bio.length > 300)) {
        return res.status(400).json({ error: 'Описание не должно быть длиннее 300 символов' });
      }
      data.bio = bio === null ? null : bio.trim();
    }

    if (avatar !== undefined) {
      // Только картинка в data URL, которую делает сам сайт. Ссылка на чужой сервер
      // позволила бы узнавать IP всех, кто открывает профиль.
      if (avatar !== null && !isValidAvatar(avatar)) {
        return res.status(400).json({ error: 'Аватар должен быть изображением не больше 500 КБ' });
      }
      data.avatar = avatar;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      // Только безопасные поля: без хэша пароля и кода подтверждения
      select: { id: true, username: true, email: true, avatar: true, bio: true }
    });
    res.json({ message: 'Профиль обновлен', user });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 5. ПОЛУЧИТЬ ПРОФИЛЬ КОНКРЕТНОГО ПОЛЬЗОВАТЕЛЯ (/:userId должен быть в конце или после конкретных маршрутов)
// router.get('/:userId', authMiddleware, async (req, res) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: req.params.userId },
//       select: {
//         id: true,
//         username: true,
//         bio: true,
//         avatar: true,
//         createdAt: true,
//         _count: { select: { movies: true } }
//       }
//     });

//     if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

//     // Проверяем статус дружбы
//     const friendship = await prisma.friend.findFirst({
//       where: {
//         OR: [
//           { userId: req.userId, friendId: user.id },
//           { userId: user.id, friendId: req.userId }
//         ]
//       }
//     });

//     res.json({ ...user, friendshipStatus: friendship?.status || 'none' });
//   } catch (error) {
//     console.error('Ошибка получения профиля:', error);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// 6. ОТПРАВИТЬ ЗАЯВКУ В ДРУЗЬЯ
router.post('/:userId/friend-request', authMiddleware, async (req, res) => {
  try {
    if (req.params.userId === req.userId) {
      return res.status(400).json({ error: 'Нельзя добавить себя' });
    }

    const target = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { id: true, isVerified: true }
    });
    if (!target || !target.isVerified) {
      return res.status(404).json({ error: 'Пользователь не найден' });
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

    notify([req.params.userId], {
      title: 'Новая заявка в друзья',
      body: `${await usernameOf(req.userId)} хочет добавить вас в друзья`,
      url: '/notifications',
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
    const { action } = req.body || {}; // 'accept' или 'reject'
    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ error: 'Неизвестное действие' });
    }

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
      notify([req.params.userId], {
        title: 'Заявка принята',
        body: `${await usernameOf(req.userId)} теперь у вас в друзьях`,
        url: `/user/${req.userId}`,
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