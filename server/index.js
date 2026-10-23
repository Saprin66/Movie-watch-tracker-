require('./config'); // грузит .env и проверяет JWT_SECRET
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const listRoutes = require('./routes/lists');
const pushRoutes = require('./routes/push');
const { authMiddleware } = require('./middleware/auth');
const { buildFeed } = require('./feed');
const { parseMeta } = require('./movieMeta');
const { corsOptions, securityHeaders, apiLimiter, cleanPosterUrl, isPositiveInt } = require('./security');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// За прокси хостинга (Render и т.п.) нужен реальный IP клиента для лимитов запросов
app.set('trust proxy', 1);

// Не сообщаем, что сервер на Express
app.disable('x-powered-by');
app.use(securityHeaders);
// Только адреса нашего фронтенда (см. security.js и переменную CORS_ORIGINS)
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
// Общий лимит запросов к API с одного адреса
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.send('Welcome to Movie Grade API');
});

// Ping для обновления lastSeen
app.get('/api/ping', authMiddleware, async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// === ПОИСК ПОЛЬЗОВАТЕЛЕЙ ===
app.get('/api/users/search', authMiddleware, async (req, res) => {
  try {
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';

    if (!query) {
      return res.status(400).json({ error: 'Поисковый запрос не может быть пустым' });
    }
    if (query.length > 50) {
      return res.status(400).json({ error: 'Слишком длинный запрос' });
    }

    // Ищем пользователей, чьё имя содержит запрос (регистронезависимо для PostgreSQL)
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive'
        },
        // Себя и неподтверждённые аккаунты в поиске не показываем
        isVerified: true,
        NOT: { id: req.userId }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        _count: {
          select: { movies: true }
        }
      },
      take: 15 // Ограничиваем выдачу 15 результатами
    });

    res.json(users);
  } catch (error) {
    console.error('Ошибка поиска пользователей:', error);
    res.status(500).json({ error: 'Не удалось выполнить поиск' });
  }
});

// Роуты пользователей (ОБЯЗАТЕЛЬНО ПОСЛЕ всех app.get('/api/users/...'))
app.use('/api/users', userRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/push', pushRoutes);

// === ВСЕ МАРШРУТЫ /api/users/* ДОЛЖНЫ БЫТЬ ВЫШЕ app.use('/api/users', userRoutes) ===

// Последний просмотренный фильм
app.get('/api/users/:userId/last-watched', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const lastWatched = await prisma.userMovie.findFirst({
      where: { userId, status: 'WATCHED' },
      orderBy: [{ watchedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
      select: { id: true, title: true, posterUrl: true, rating: true, updatedAt: true }
    });
    res.json(lastWatched);
  } catch (error) {
    console.error('Ошибка получения последнего фильма:', error);
    res.status(500).json({ error: 'Не удалось получить данные' });
  }
});

// СПИСОК ДРУЗЕЙ — используем УНИКАЛЬНЫЙ путь /api/friends/list
app.get('/api/friends/list', authMiddleware, async (req, res) => {
  try {
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: req.userId, status: 'accepted' },
          { friendId: req.userId, status: 'accepted' }
        ]
      },
      include: {
        user: {
          select: {
            id: true, username: true, avatar: true, bio: true, lastSeen: true
          }
        },
        friend: {
          select: {
            id: true, username: true, avatar: true, bio: true, lastSeen: true
          }
        }
      }
    });

    const friends = friendships.map(f => {
      const friendUser = f.userId === req.userId ? f.friend : f.user;
      return {
        id: friendUser.id,
        username: friendUser.username,
        // email друзьям не показываем (см. политику конфиденциальности)
        avatar: friendUser.avatar,
        bio: friendUser.bio,
        lastSeen: friendUser.lastSeen
      };
    });

   
    res.json(friends);
  } catch (error) {
    console.error('Ошибка загрузки списка друзей:', error);
    res.status(500).json({ error: 'Не удалось загрузить список друзей' });
  }
});
// УДАЛИТЬ ИЗ ДРУЗЕЙ: убирает дружбу (и любые заявки) в обе стороны
app.delete('/api/friends/:friendId', authMiddleware, async (req, res) => {
  try {
    const { friendId } = req.params;
    if (friendId === req.userId) {
      return res.status(400).json({ error: 'Нельзя удалить себя' });
    }
    const result = await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId: req.userId, friendId },
          { userId: friendId, friendId: req.userId }
        ]
      }
    });
    if (result.count === 0) {
      return res.status(404).json({ error: 'Этого пользователя нет в друзьях' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления из друзей:', error);
    res.status(500).json({ error: 'Не удалось удалить из друзей' });
  }
});

app.get('/api/users/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId; // <-- ID того, чей профиль смотрим

    // 1. Получаем базовые данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true, username: true, avatar: true, bio: true, lastSeen: true, createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Комментарии к фильмам видны только самому пользователю и его друзьям
    let canSeeReviews = targetUserId === req.userId;
    if (!canSeeReviews) {
      const friendship = await prisma.friend.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { userId: req.userId, friendId: targetUserId },
            { userId: targetUserId, friendId: req.userId }
          ]
        },
        select: { id: true }
      });
      canSeeReviews = Boolean(friendship);
    }

    // 2. Считаем статистику ИМЕННО для targetUserId (а не req.userId!)
    const [moviesCount, watchedCount, friendsCount, recentMoviesRaw] = await Promise.all([
      // Всего фильмов в журнале
      prisma.userMovie.count({ where: { userId: targetUserId } }),
      
      // Просмотренных фильмов
      prisma.userMovie.count({ where: { userId: targetUserId, status: 'WATCHED' } }),
      
      // Друзей (где этот пользователь является userId ИЛИ friendId)
      prisma.friend.count({
        where: {
          OR: [
            { userId: targetUserId, status: 'accepted' },
            { friendId: targetUserId, status: 'accepted' }
          ]
        }
      }),
      
      // Последние 6 фильмов
      prisma.userMovie.findMany({
        where: { userId: targetUserId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          tmdbId: true,
          title: true,
          posterUrl: true,
          status: true,
          rating: true,
          comment: true,
          watchedAt: true,
          updatedAt: true
        }
      })
    ]);

    const recentMovies = recentMoviesRaw.map((m) =>
      canSeeReviews ? m : { ...m, comment: null }
    );

    const profileFriends = await prisma.friend.findMany({
      where: { status: 'accepted', OR: [{ userId: targetUserId }, { friendId: targetUserId }] },
      select: {
        user: { select: { id: true, username: true, avatar: true, lastSeen: true } },
        friend: { select: { id: true, username: true, avatar: true, lastSeen: true } },
      },
    });
    const friendsList = profileFriends.map((relation) =>
      relation.user.id === targetUserId ? relation.friend : relation.user
    );

    // 3. Отправляем плоский, понятный фронтенду объект
    res.json({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      moviesCount,       // <-- Явные поля
      watchedCount,      // <-- Явные поля
      friendsCount,      // <-- Явные поля
      recentMovies,
      friends: friendsList,
      reviewsHidden: !canSeeReviews
    });
  } catch (error) {
    console.error('❌ Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Не удалось загрузить профиль' });
  }
});

// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (без поля type)
// app.get('/api/users/:userId', authMiddleware, async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       select: {
//         id: true, username: true, email: true, avatar: true, bio: true, lastSeen: true, createdAt: true
//       }
//     });

//     if (!user) {
//       return res.status(404).json({ error: 'Пользователь не найден' });
//     }

//     const [moviesCount, watchedCount, friendsCount, recentMovies] = await Promise.all([
//       prisma.userMovie.count({ where: { userId } }),
//       prisma.userMovie.count({ where: { userId, status: 'WATCHED' } }),
//       prisma.friend.count({
//         where: {
//           OR: [
//             { userId, status: 'accepted' },
//             { friendId: userId, status: 'accepted' }
//           ]
//         }
//       }),
//       prisma.userMovie.findMany({
//         where: { userId },
//         orderBy: { updatedAt: 'desc' },
//         take: 6,
//         select: {
//           id: true,
//           tmdbId: true,
//           title: true,
//           posterUrl: true,
//           status: true,
//           updatedAt: true
//         }
//       })
//     ]);

//     res.json({
//       id: user.id,
//       username: user.username,
//       avatar: user.avatar,
//       bio: user.bio,
//       lastSeen: user.lastSeen,
//       createdAt: user.createdAt,
//       moviesCount,
//       watchedCount,
//       friendsCount,
//       recentMovies
//     });
//   } catch (error) {
//     console.error('Ошибка получения профиля:', error);
//     res.status(500).json({ error: 'Не удалось загрузить профиль' });
//   }
// });

// ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (ИСПРАВЛЕННЫЙ: считает статистику ИМЕННО для userId из URL)


// Роуты пользователей (должен быть ПОСЛЕ всех специфичных маршрутов)
app.use('/api/users', userRoutes);

// Фильмы
app.get('/api/movies', authMiddleware, async (req, res) => {
  try {
    const movies = await prisma.userMovie.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movies);
  } catch (error) {
    console.error('Ошибка получения фильмов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/movies', authMiddleware, async (req, res) => {
  try {
    const { tmdbId, title, posterUrl, status } = req.body || {};
    const mediaType = (req.body?.mediaType || req.body?.type) === 'tv' ? 'tv' : 'movie';

    if (!isPositiveInt(tmdbId)) {
      return res.status(400).json({ error: 'Неверный идентификатор фильма' });
    }
    if (typeof title !== 'string' || title.trim() === '' || title.length > 300) {
      return res.status(400).json({ error: 'Неверное название' });
    }
    if (status !== undefined && !['WATCHED', 'WATCHLIST'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    // Оценка необязательна: целое число от 1 до 10
    let rating = null;
    if (typeof req.body?.rating === 'number' && Number.isFinite(req.body?.rating)) {
      const parsed = Math.round(req.body?.rating);
      if (parsed >= 1 && parsed <= 10) rating = parsed;
    }

    const existing = await prisma.userMovie.findFirst({
      where: { userId: req.userId, tmdbId, mediaType }
    });
    if (existing) {
      return res.status(409).json({ error: 'Уже есть в журнале' });
    }

    // Год и жанры для фильтров (необязательны)
    const meta = parseMeta(req.body);
    const hasMeta = Boolean(meta.releaseYear) || (meta.genres && meta.genres.length > 0);

    const newMovie = await prisma.userMovie.create({
      data: {
        tmdbId,
        title: title.trim(),
        // Только картинки TMDB: чужая ссылка в постере могла бы следить за друзьями по IP
        posterUrl: cleanPosterUrl(posterUrl),
        mediaType,
        status: status || 'WATCHLIST',
        watchedAt: status === 'WATCHED' ? new Date() : null,
        rating,
        releaseYear: meta.releaseYear ?? null,
        genres: meta.genres ?? [],
        metaCheckedAt: hasMeta ? new Date() : null,
        userId: req.userId
      }
    });
    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Ошибка добавления фильма:', error);
    res.status(500).json({ error: 'Не удалось добавить фильм' });
  }
});

app.delete('/api/movies/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await prisma.userMovie.findFirst({ where: { id, userId: req.userId } });
    if (!movie) return res.status(404).json({ error: 'Фильм не найден' });
    await prisma.userMovie.delete({ where: { id } });
    res.json({ message: 'Фильм удален' });
  } catch (error) {
    console.error('Ошибка удаления фильма:', error);
    res.status(500).json({ error: 'Не удалось удалить фильм' });
  }
});

app.put('/api/movies/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['WATCHED', 'WATCHLIST'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }
    const movie = await prisma.userMovie.findFirst({ where: { id, userId: req.userId } });
    if (!movie) return res.status(404).json({ error: 'Фильм не найден' });
    const data = { status };
    if (status === 'WATCHED' && movie.status !== 'WATCHED') data.watchedAt = new Date();
    if (status === 'WATCHLIST') data.watchedAt = null;
    const updatedMovie = await prisma.userMovie.update({ where: { id }, data });
    res.json(updatedMovie);
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Не удалось обновить статус' });
  }
});

// Получение метаданных записи. Удобно для диагностики и повторной загрузки
// клиента: этот URL может открываться как GET, а обновление выполняется через PUT.
app.get('/api/movies/:id/meta', authMiddleware, async (req, res) => {
  try {
    const movie = await prisma.userMovie.findFirst({
      where: { id: req.params.id, userId: req.userId },
      select: { id: true, releaseYear: true, genres: true, metaCheckedAt: true, mediaType: true, tmdbId: true },
    });
    if (!movie) return res.status(404).json({ error: 'Запись фильма не найдена в журнале текущего пользователя' });
    res.json(movie);
  } catch (error) {
    console.error('Ошибка получения данных фильма:', error);
    res.status(500).json({ error: 'Не удалось получить данные фильма' });
  }
});

// Год, жанры (и исправление типа) для записи. Клиент дозаполняет их у старых записей.
// updatedAt сохраняем как был: иначе фоновое дозаполнение подняло бы старые записи в ленту друзей.
app.put('/api/movies/:id/meta', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await prisma.userMovie.findFirst({ where: { id, userId: req.userId } });
    if (!movie) return res.status(404).json({ error: 'Фильм не найден' });

    const meta = parseMeta(req.body);
    const data = { ...meta, metaCheckedAt: new Date(), updatedAt: movie.updatedAt };

    // Старые записи сохранялись как «фильм», даже если это сериал
    const nextType = req.body?.mediaType;
    if ((nextType === 'tv' || nextType === 'movie') && nextType !== movie.mediaType) {
      const clash = await prisma.userMovie.findFirst({
        where: { userId: req.userId, tmdbId: movie.tmdbId, mediaType: nextType }
      });
      if (!clash) data.mediaType = nextType;
    }

    const updated = await prisma.userMovie.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    console.error('Ошибка обновления данных фильма:', error);
    res.status(500).json({ error: 'Не удалось обновить данные фильма' });
  }
});

// Лента активности друзей: последние добавления, просмотры, оценки и отзывы
app.get('/api/feed', authMiddleware, async (req, res) => {
  try {
    const friendships = await prisma.friend.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId: req.userId }, { friendId: req.userId }]
      },
      select: { userId: true, friendId: true }
    });
    const friendIds = friendships.map((f) => (f.userId === req.userId ? f.friendId : f.userId));

    if (friendIds.length === 0) {
      return res.json({ items: [], hasFriends: false });
    }

    const rows = await prisma.userMovie.findMany({
      where: { userId: { in: friendIds } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select: {
        id: true,
        tmdbId: true,
        title: true,
        posterUrl: true,
        mediaType: true,
        status: true,
        rating: true,
        comment: true,
        updatedAt: true,
        user: { select: { id: true, username: true } }
      }
    });

    res.json({ items: buildFeed(rows, 40), hasFriends: true });
  } catch (error) {
    console.error('Ошибка загрузки ленты:', error);
    res.status(500).json({ error: 'Не удалось загрузить ленту' });
  }
});

// Оценки и отзывы друзей к одному фильму (для страницы оценки)
app.get('/api/friends/reviews', authMiddleware, async (req, res) => {
  try {
    const tmdbId = Number(req.query.tmdbId);
    const mediaType = req.query.mediaType === 'tv' ? 'tv' : 'movie';
    if (!Number.isInteger(tmdbId)) {
      return res.status(400).json({ error: 'Неверный идентификатор фильма' });
    }

    const friendships = await prisma.friend.findMany({
      where: {
        status: 'accepted',
        OR: [{ userId: req.userId }, { friendId: req.userId }]
      },
      select: { userId: true, friendId: true }
    });
    const friendIds = friendships.map((f) => (f.userId === req.userId ? f.friendId : f.userId));
    if (friendIds.length === 0) return res.json([]);

    const rows = await prisma.userMovie.findMany({
      where: {
        userId: { in: friendIds },
        tmdbId,
        mediaType,
        OR: [{ rating: { not: null } }, { comment: { not: null } }]
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        updatedAt: true,
        user: { select: { id: true, username: true, avatar: true } }
      }
    });
    res.json(rows);
  } catch (error) {
    console.error('Ошибка загрузки отзывов друзей:', error);
    res.status(500).json({ error: 'Не удалось загрузить отзывы друзей' });
  }
});

// Оценка (1-10) и комментарий к фильму из своего журнала
app.put('/api/movies/:id/review', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const movie = await prisma.userMovie.findFirst({ where: { id, userId: req.userId } });
    if (!movie) return res.status(404).json({ error: 'Фильм не найден' });

    const data = {};

    if ('rating' in body) {
      if (body.rating === null) {
        data.rating = null;
      } else {
        const rating = body.rating;
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 10) {
          return res.status(400).json({ error: 'Оценка должна быть целым числом от 1 до 10' });
        }
        data.rating = rating;
      }
    }

    if ('comment' in body) {
      const { comment } = body;
      if (comment === null || (typeof comment === 'string' && comment.trim() === '')) {
        data.comment = null;
      } else if (typeof comment !== 'string' || comment.length > 1000) {
        return res.status(400).json({ error: 'Комментарий не должен быть длиннее 1000 символов' });
      } else {
        data.comment = comment.trim();
      }
    }

    // Поставил оценку — значит, фильм просмотрен
    if (data.rating != null && movie.status !== 'WATCHED') {
      data.status = 'WATCHED';
      data.watchedAt = new Date();
    }

    if (Object.keys(data).length === 0) return res.json(movie);

    const updated = await prisma.userMovie.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    console.error('Ошибка сохранения отзыва:', error);
    res.status(500).json({ error: 'Не удалось сохранить отзыв' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Movie Grade API running on port ${PORT}`);
});