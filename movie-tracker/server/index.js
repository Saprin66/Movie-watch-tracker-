const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Поисковый запрос не может быть пустым' });
    }

    // Ищем пользователей, чьё имя содержит запрос (регистронезависимо для PostgreSQL)
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive' 
        }
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

// === ВСЕ МАРШРУТЫ /api/users/* ДОЛЖНЫ БЫТЬ ВЫШЕ app.use('/api/users', userRoutes) ===

// Последний просмотренный фильм
app.get('/api/users/:userId/last-watched', async (req, res) => {
  try {
    const { userId } = req.params;
    const lastWatched = await prisma.userMovie.findFirst({
      where: { userId, status: 'WATCHED' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, posterUrl: true, updatedAt: true }
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
            id: true, username: true, email: true, avatar: true, bio: true, lastSeen: true
          }
        },
        friend: {
          select: {
            id: true, username: true, email: true, avatar: true, bio: true, lastSeen: true
          }
        }
      }
    });

    const friends = friendships.map(f => {
      const friendUser = f.userId === req.userId ? f.friend : f.user;
      return {
        id: friendUser.id,
        username: friendUser.username,
        email: friendUser.email,
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
app.get('/api/users/:userId', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.userId; // <-- ID того, чей профиль смотрим

    // 1. Получаем базовые данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true, username: true, email: true, avatar: true, bio: true, lastSeen: true, createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // 2. Считаем статистику ИМЕННО для targetUserId (а не req.userId!)
    const [moviesCount, watchedCount, friendsCount, recentMovies] = await Promise.all([
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
        take: 6,
        select: {
          id: true,
          tmdbId: true,
          title: true,
          posterUrl: true,
          status: true,
          updatedAt: true
        }
      })
    ]);

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
      recentMovies       // <-- Явный массив
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
    const { tmdbId, title, posterUrl, status, type } = req.body;
    const newMovie = await prisma.userMovie.create({
      data: {
        tmdbId, title, posterUrl,
        status: status || 'WATCHLIST',
        
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
    const { status } = req.body;
    if (!['WATCHED', 'WATCHLIST'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }
    const movie = await prisma.userMovie.findFirst({ where: { id, userId: req.userId } });
    if (!movie) return res.status(404).json({ error: 'Фильм не найден' });
    const updatedMovie = await prisma.userMovie.update({ where: { id }, data: { status } });
    res.json(updatedMovie);
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Не удалось обновить статус' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Movie Grade API running on port ${PORT}`);
});