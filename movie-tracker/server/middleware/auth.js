const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Создаём свой экземпляр Prisma прямо здесь — это самый надёжный способ
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Проверяем, есть ли заголовок и начинается ли он с "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ Запрос без токена или неверный формат');
      return res.status(401).json({ error: 'Нет токена или неверный формат' });
    }

    const token = authHeader.split(' ')[1];
    
    // Верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Ищем пользователя
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      console.warn('⚠️ Пользователь из токена не найден в базе');
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    // Обновляем время последнего посещения (lastSeen)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date() }
    });

    // Передаем ID пользователя дальше в маршрут
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('❌ Ошибка в authMiddleware:', error.message);
    res.status(401).json({ error: 'Недействительный или протухший токен' });
  }
};

module.exports = { authMiddleware };