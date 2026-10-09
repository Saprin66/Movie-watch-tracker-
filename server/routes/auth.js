const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { Resend } = require('resend');
const { authMiddleware} = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'movie-grade-secret-key-2024';

// ⚠️ ВАЖНО: Замени 'твой-домен.ru' на твой реальный домен, который ты подключил!
const FROM_EMAIL = 'Movie Grade <hello@sapringrade.ru>'; 

// Генерация случайного 6-значного кода
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. РЕГИСТРАЦИЯ
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким именем или email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 минут

    const user = await prisma.user.create({
      data: { 
        username, 
        email, 
        password: hashedPassword, 
        verificationCode,
        codeExpiresAt 
      }
    });

    // Отправка письма через Resend (с твоего домена)
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Подтверждение email - Movie Grade',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">🎬 Movie Grade</h1>
            <p>Привет, <strong>${username}</strong>!</p>
            <p>Твой код подтверждения:</p>
            <div style="background: #f97316; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            <p>Код действителен 10 минут.</p>
          </div>
        `
      });
      console.log('✅ Email отправлен на:', email);
    } catch (emailError) {
      console.error('❌ Ошибка отправки email:', emailError);
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        isVerified: user.isVerified 
      },
      message: 'Код подтверждения отправлен на email'
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// 2. ВХОД
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await prisma.user.findUnique({ where: { username } });

//     if (!user) return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });

//     const validPassword = await bcrypt.compare(password, user.password);
//     if (!validPassword) return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });

//     if (!user.isVerified) {
//       return res.status(403).json({ 
//         error: 'Пожалуйста, подтвердите ваш email',
//         needsVerification: true 
//       });
//     }

//     const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

//     res.json({ 
//       token, 
//       user: { 
//         id: user.id, 
//         username: user.username, 
//         email: user.email,
//         isVerified: user.isVerified 
//       } 
//     });
//   } catch (error) {
//     console.error('Ошибка входа:', error);
//     res.status(500).json({ error: 'Ошибка при входе' });
//   }
// });

// Вход по email
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Введите email и пароль' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Подтвердите email перед входом' });
    }

    // Обновляем lastSeen при входе
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() }
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Нет токена' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        isVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 4. ПОДТВЕРЖДЕНИЕ EMAIL
router.post('/verify-email', async (req, res) => {
  try {
    const { code } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (user.isVerified) return res.json({ message: 'Email уже подтвержден' });

    if (user.codeExpiresAt && new Date() > user.codeExpiresAt) {
      return res.status(400).json({ error: 'Код истек. Запросите новый.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Неверный код подтверждения' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, verificationCode: null, codeExpiresAt: null }
    });

    res.json({ message: 'Email успешно подтвержден!' });
  } catch (error) {
    console.error('Ошибка подтверждения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 5. ПОВТОРНАЯ ОТПРАВКА КОДА
router.post('/resend-code', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (user.isVerified) return res.json({ message: 'Email уже подтвержден' });

    const newCode = generateCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: newCode, codeExpiresAt }
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Новый код подтверждения - Movie Grade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f97316;">🎬 Movie Grade</h1>
          <p>Привет, <strong>${user.username}</strong>!</p>
          <p>Твой новый код подтверждения:</p>
          <div style="background: #f97316; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; border-radius: 8px; margin: 20px 0;">
            ${newCode}
          </div>
          <p>Код действителен 10 минут.</p>
        </div>
      `
    });

    res.json({ message: 'Новый код отправлен на email' });
  } catch (error) {
    console.error('Ошибка повторной отправки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


// Обновление профиля (смена ника)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Ник должен содержать минимум 3 символа' });
    }

    if (username.trim().length > 20) {
      return res.status(400).json({ error: 'Ник не может быть длиннее 20 символов' });
    }

    // Проверяем, не занят ли ник
    const existingUser = await prisma.user.findFirst({
      where: {
        username: username.trim(),
        id: { not: req.userId }
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Этот ник уже занят' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: { username: username.trim() },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true
      }
    });

    res.json({ 
      success: true, 
      message: 'Ник успешно изменён',
      user: updatedUser
    });
  } catch (error) {
    console.error('Ошибка обновления ника:', error);
    res.status(500).json({ error: 'Не удалось изменить ник' });
  }
});

module.exports = router;