const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*', // Разрешаем запросы с любого домена (для MVP это ок)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // Позволяет серверу понимать JSON в запросах

// Тестовый эндпоинт
app.get('/', (req, res) => res.send('API is running...'));

// 1. Получить список всех фильмов (пока без привязки к конкретному юзеру)
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.userMovie.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// 2. Добавить новый фильм
app.post('/api/movies', async (req, res) => {
  try {
    const { tmdbId, title, posterUrl, status } = req.body;

    // Для MVP: создаем тестового юзера, если его еще нет в базе
    // В будущем тут будет логика авторизации
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { username: 'test_user', password: 'password123' }
      });
    }

    // Создаем запись о фильме
    const newMovie = await prisma.userMovie.create({
      data: {
        tmdbId,
        title,
        posterUrl,
        status: status || 'WATCHLIST', // По умолчанию "Буду смотреть"
        userId: user.id
      }
    });

    res.status(201).json(newMovie); // 201 означает "Создано"
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not add movie' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});