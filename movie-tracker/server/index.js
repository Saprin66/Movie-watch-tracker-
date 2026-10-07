const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const authMiddleware = require('./middleware/auth');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Тестовый эндпоинт
app.get('/', (req, res) => {
  res.send('Welcome to Movie Grade API');
});

// Роуты авторизации
app.use('/api/auth', authRoutes);

// Роуты пользователей (друзья, профили)
app.use('/api/users', userRoutes);

// Получить фильмы текущего пользователя
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

// Получить фильмы конкретного пользователя (для просмотра профиля)
app.get('/api/users/:userId/movies', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userMovies = await prisma.userMovie.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(userMovies);
  } catch (error) {
    console.error('Ошибка загрузки фильмов пользователя:', error);
    res.status(500).json({ error: 'Не удалось загрузить фильмы' });
  }
});

// Добавить фильм
app.post('/api/movies', authMiddleware, async (req, res) => {
  try {
    const { tmdbId, title, posterUrl, status } = req.body;

    const newMovie = await prisma.userMovie.create({
      data: {
        tmdbId,
        title,
        posterUrl,
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

// Удалить фильм
app.delete('/api/movies/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const movie = await prisma.userMovie.findFirst({
      where: { id, userId: req.userId }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }

    await prisma.userMovie.delete({
      where: { id }
    });
    
    res.json({ message: 'Фильм удален' });
  } catch (error) {
    console.error('Ошибка удаления фильма:', error);
    res.status(500).json({ error: 'Не удалось удалить фильм' });
  }
});

// Изменить статус фильма
app.put('/api/movies/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['WATCHED', 'WATCHLIST'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    const movie = await prisma.userMovie.findFirst({
      where: { id, userId: req.userId }
    });

    if (!movie) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    
    const updatedMovie = await prisma.userMovie.update({
      where: { id },
      data: { status }
    });
    
    res.json(updatedMovie);
  } catch (error) {
    console.error('Ошибка обновления статуса:', error);
    res.status(500).json({ error: 'Не удалось обновить статус' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Movie Grade API running on port ${PORT}`);
});