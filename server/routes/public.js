// Публичная страница профиля: открывается по ссылке без входа.
// Только для открытых (не приватных) профилей с подтверждённым email.
// Тексты отзывов и список друзей здесь не отдаём — они по-прежнему видны только друзьям.
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { rateLimit } = require('../middleware/rateLimit');
const { planOf } = require('../plans');
const { cleanUsername } = require('../security');

const router = express.Router();
const prisma = new PrismaClient();

// Страница доступна всем, поэтому лимит строже общего
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Слишком много запросов. Подождите минуту.',
});

const SHELF_SIZE = 12;

router.get('/users/:username', publicLimiter, async (req, res) => {
  try {
    const username = cleanUsername(req.params.username);
    if (!username) return res.status(404).json({ error: 'Профиль не найден' });

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' }, isVerified: true },
      select: {
        id: true, username: true, avatar: true, bio: true, createdAt: true, isPrivate: true,
        plan: true, promoPlan: true, promoUntil: true, profileTheme: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Профиль не найден' });

    const plan = planOf(user);
    const base = {
      username: user.username,
      avatar: user.avatar,
      plan,
      profileTheme: plan === 'brilliant' ? user.profileTheme : null,
    };
    // Закрытый профиль: только имя и аватар, без журнала
    if (user.isPrivate) return res.json({ ...base, isPrivate: true });

    const movieSelect = {
      tmdbId: true, mediaType: true, title: true, posterUrl: true, rating: true, releaseYear: true,
    };
    const [rows, topRated, recent, friendsCount] = await Promise.all([
      prisma.userMovie.findMany({
        where: { userId: user.id },
        select: { status: true, mediaType: true, rating: true, genres: true },
      }),
      prisma.userMovie.findMany({
        where: { userId: user.id, status: 'WATCHED', rating: { gte: 8 } },
        orderBy: [{ rating: 'desc' }, { watchedAt: { sort: 'desc', nulls: 'last' } }],
        take: SHELF_SIZE,
        select: movieSelect,
      }),
      prisma.userMovie.findMany({
        where: { userId: user.id, status: 'WATCHED' },
        orderBy: [{ watchedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        take: SHELF_SIZE,
        select: movieSelect,
      }),
      prisma.friend.count({
        where: { status: 'accepted', OR: [{ userId: user.id }, { friendId: user.id }] },
      }),
    ]);

    const watched = rows.filter((m) => m.status === 'WATCHED');
    const rated = watched.filter((m) => m.rating);
    const genreCounts = new Map();
    for (const m of watched) {
      for (const g of m.genres || []) genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    }

    res.json({
      ...base,
      bio: user.bio,
      createdAt: user.createdAt,
      isPrivate: false,
      stats: {
        watchedMovies: watched.filter((m) => m.mediaType !== 'tv').length,
        watchedSeries: watched.filter((m) => m.mediaType === 'tv').length,
        watchlist: rows.length - watched.length,
        averageRating: rated.length
          ? Math.round((rated.reduce((sum, m) => sum + m.rating, 0) / rated.length) * 10) / 10
          : null,
        friends: friendsCount,
      },
      topGenres: [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topRated,
      recent,
    });
  } catch (error) {
    console.error('Ошибка загрузки публичного профиля:', error);
    res.status(500).json({ error: 'Не удалось загрузить профиль' });
  }
});

module.exports = router;
