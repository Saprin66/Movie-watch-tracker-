// Настройки безопасности сервера: CORS, заголовки, общий лимит запросов и проверки ввода.
const { rateLimit } = require('./middleware/rateLimit');

const IS_PROD = process.env.NODE_ENV === 'production';

// ---------- CORS ----------
// Разрешаем только известные адреса фронтенда. Список из CORS_ORIGINS (через запятую)
// дополняется адресами проекта на Vercel и локальной разработкой.
const ENV_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

// TODO: SECURITY REVIEW — если фронтенд открывается ещё с какого-то адреса
// (например, домен Cloudflare Workers), его нужно добавить в CORS_ORIGINS на хостинге.
const DEFAULT_ORIGINS = [
  'https://sapringrade.ru',
  'https://www.sapringrade.ru',
  'https://movie-watch-tracker.vercel.app',
];
// Превью-деплои Vercel этого проекта: movie-watch-tracker-<хэш>-saprin-team.vercel.app
const VERCEL_PREVIEW_RE = /^https:\/\/movie-watch-tracker-[a-z0-9-]+-saprin-team\.vercel\.app$/;
const LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...ENV_ORIGINS]);

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;
  if (VERCEL_PREVIEW_RE.test(origin)) return true;
  if (!IS_PROD && LOCAL_RE.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    // Без заголовка Origin приходят запросы не из браузера (curl, проверки хостинга)
    // и обычные переходы по ссылке на картинку — CORS к ним не относится.
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn('CORS: запрос с неразрешённого адреса', origin);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
};

// ---------- Заголовки безопасности (аналог helmet для JSON API) ----------
// helmet здесь не подключён: пакет нельзя было поставить в среде, где готовились правки,
// а менять package-lock.json вручную рискованно. Заголовки ниже покрывают то же для API.
// TODO: SECURITY REVIEW — при желании заменить на helmet: npm install helmet,
// затем app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })).
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Opener-Policy': 'same-origin',
    // API отдаёт только JSON: никакие скрипты, стили и фреймы из его ответов не нужны
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (IS_PROD) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

// ---------- Общий лимит на API ----------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Слишком много запросов. Подождите минуту.',
});

// ---------- Проверки ввода ----------
// Постеры принимаем только с TMDB: иначе в карточку можно подставить чужую ссылку,
// и картинка-«маячок» узнает IP всех, кто смотрит ленту или общий список.
const TMDB_IMAGE_RE = /^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]+\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|svg)$/;
function cleanPosterUrl(value) {
  return typeof value === 'string' && value.length <= 300 && TMDB_IMAGE_RE.test(value) ? value : null;
}

// Аватар — только картинка, закодированная в data URL (её делает сам сайт при загрузке)
const AVATAR_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
function isValidAvatar(value) {
  return typeof value === 'string' && value.length <= 500_000 && AVATAR_RE.test(value);
}

// Ник: буквы, цифры, пробел, точка, дефис и подчёркивание. Без невидимых и служебных символов.
const USERNAME_RE = /^[\p{L}\p{N}_.\- ]{3,20}$/u;
function cleanUsername(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return USERNAME_RE.test(name) ? name : null;
}

function isPositiveInt(value, max = 2_147_483_647) {
  return Number.isInteger(value) && value > 0 && value <= max;
}

module.exports = {
  corsOptions,
  securityHeaders,
  apiLimiter,
  cleanPosterUrl,
  isValidAvatar,
  cleanUsername,
  isPositiveInt,
};
