const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// 1. CORS и JSON
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 2. Тестовый роут
app.get('/', (req, res) => {
  res.send('Welcome to the movie-tracker API');
});

// 3. Получить все фильмы
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await prisma.userMovie.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Добавить фильм
app.post('/api/movies', async (req, res) => {
  try {
    const { tmdbId, title, posterUrl, status } = req.body;
    
    // Создаем тестового юзера, если его нет (для простоты пока)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { username: 'test_user', email: 'test@test.com', password: '123' } });
    }

    const newMovie = await prisma.userMovie.create({
      data: { tmdbId, title, posterUrl, status: status || 'WATCHLIST', userId: user.id }
    });
    res.status(201).json(newMovie);
  } catch (error) {
    console.error('Error adding movie:', error);
    res.status(500).json({ error: 'Could not add movie' });
  }
});

// 5. Удалить фильм (ИМЕННО ЭТОГО НЕ ХВАТАЛО)
app.delete('/api/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.userMovie.delete({ where: { id } });
    res.json({ message: 'Movie deleted' });
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ error: 'Could not delete movie' });
  }
});

// 6. Изменить статус фильма (И ЭТОГО ТОЖЕ)
app.put('/api/movies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['WATCHED', 'WATCHLIST'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updatedMovie = await prisma.userMovie.update({
      where: { id },
      data: { status }
    });
    res.json(updatedMovie);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Could not update status' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});