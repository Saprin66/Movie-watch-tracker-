const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 10000;

// 1. Настройки CORS (разрешаем запросы с Vercel и везде)
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Разрешаем серверу читать JSON
app.use(express.json());

// 3. Тестовый эндпоинт (главная страница)
app.get('/', (req, res) => {
  res.send('Welcome to the movie-tracker application express server home');
});

// 4. Получить список всех фильмов
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.userMovie.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(movies);
  } catch (error) {
    console.error('Ошибка при получении фильмов:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Добавить новый фильм
app.post('/api/movies', async (req, res) => {
  try {
    const { tmdbId, title, posterUrl, status } = req.body;

    // Создаем тестового пользователя, если его нет
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { username: 'test_user', password: 'password123' }
      });
    }

    // Сохраняем фильм в базу
    const newMovie = await prisma.userMovie.create({
      data: {
        tmdbId,
        title,
        posterUrl,
        status: status || 'WATCHLIST',
        userId: user.id
      }
    });

    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Ошибка при добавлении фильма:', error);
    res.status(500).json({ error: 'Could not add movie' });
  }
});

// 6. Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});