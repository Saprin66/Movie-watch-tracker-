require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error(
    '❌ Не задана переменная окружения JWT_SECRET (минимум 16 символов). ' +
    'Добавьте её в server/.env и в настройки хостинга.'
  );
  process.exit(1);
}

// Список разрешённых адресов фронтенда через запятую, например:
// CORS_ORIGINS=https://moviegrade.ru,http://localhost:5173
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = { JWT_SECRET, CORS_ORIGINS };
