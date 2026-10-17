// Прокси к TMDB: браузер обращается к нашему серверу, а сервер к TMDB.
// Так сайт работает и у тех, у кого api.themoviedb.org и image.tmdb.org недоступны.
//
// /api/tmdb/<путь TMDB>?<параметры>  → https://api.themoviedb.org/3/<путь>
// /api/img/<размер>/<файл>           → https://image.tmdb.org/t/p/<размер>/<файл>
//
// Ключ берётся из переменной окружения TMDB_API_KEY. Если её нет, используется ключ,
// который прислал клиент (VITE_TMDB_API_KEY), чтобы ничего не сломалось до настройки.
const { rateLimit } = require('./middleware/rateLimit');

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const SERVER_KEY = process.env.TMDB_API_KEY || '';

if (!SERVER_KEY) {
  console.warn(
    '⚠️ TMDB_API_KEY не задан: прокси TMDB использует ключ из запроса клиента. ' +
    'Добавьте TMDB_API_KEY в настройки хостинга.'
  );
}

// Разрешённые разделы API (только чтение)
const API_PATH_RE = /^\/(movie|tv|search|discover|genre|trending)(\/[a-z0-9_]+){0,4}$/;
const IMG_PATH_RE = /^\/(w45|w92|w154|w185|w300|w342|w500|w780|w1280|h632|original)\/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp|svg)$/;

const UPSTREAM_TIMEOUT_MS = 10000;

// ---- Небольшой кэш в памяти: TMDB меняется медленно, а запросы часто повторяются ----
function createCache({ maxEntries, maxBytes = Infinity }) {
  const map = new Map();
  let bytes = 0;
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        map.delete(key);
        bytes -= entry.size;
        return null;
      }
      // Свежее использование — в конец очереди
      map.delete(key);
      map.set(key, entry);
      return entry;
    },
    set(key, value, ttlMs, size = 0) {
      if (size > maxBytes / 10) return; // слишком большие не кэшируем
      const old = map.get(key);
      if (old) {
        map.delete(key);
        bytes -= old.size;
      }
      map.set(key, { ...value, size, expiresAt: Date.now() + ttlMs });
      bytes += size;
      while (map.size > maxEntries || bytes > maxBytes) {
        const [oldestKey, oldest] = map.entries().next().value;
        map.delete(oldestKey);
        bytes -= oldest.size;
      }
    },
  };
}

const apiCache = createCache({ maxEntries: 1500 });
const imgCache = createCache({ maxEntries: 3000, maxBytes: 80 * 1024 * 1024 });

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: 'Слишком много запросов к каталогу. Подождите минуту.',
});
const imgLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2000,
  message: 'Слишком много запросов картинок. Подождите минуту.',
});

function apiTtl(path) {
  if (path.startsWith('/search')) return 10 * 60 * 1000;
  if (/\/(popular|now_playing|top_rated|trending|discover)/.test(path) || path.startsWith('/trending') || path.startsWith('/discover')) {
    return 30 * 60 * 1000;
  }
  return 6 * 60 * 60 * 1000; // детали фильма, жанры, актёры, сервисы
}

async function tmdbApi(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ status_message: 'Только GET' });

  const path = req.path;
  if (!API_PATH_RE.test(path)) {
    return res.status(404).json({ status_message: 'Такой запрос к TMDB не поддерживается' });
  }

  const params = new URLSearchParams();
  let clientKey = '';
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value !== 'string' || value.length > 300) continue;
    if (key === 'api_key') clientKey = value;
    else params.set(key, value);
  }
  params.sort();

  const apiKey = SERVER_KEY || (clientKey !== 'server' ? clientKey : '');
  if (!apiKey) {
    return res.status(503).json({ status_message: 'На сервере не настроен ключ TMDB (TMDB_API_KEY)' });
  }

  const cacheKey = `${path}?${params.toString()}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=300');
    res.set('X-Cache', 'HIT');
    return res.status(cached.status).type('application/json').send(cached.body);
  }

  params.set('api_key', apiKey);
  try {
    const upstream = await fetch(`${TMDB_API}${path}?${params.toString()}`, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    const body = await upstream.text();
    // Ответы 200 и 404 кэшируем, ошибки сервиса и лимиты — нет
    if (upstream.status === 200 || upstream.status === 404) {
      apiCache.set(cacheKey, { status: upstream.status, body }, apiTtl(path));
    }
    res.set('Cache-Control', upstream.ok ? 'public, max-age=300' : 'no-store');
    res.status(upstream.status).type('application/json').send(body);
  } catch (error) {
    console.error('Ошибка запроса к TMDB:', path, error.message);
    res.status(502).json({ status_message: 'TMDB сейчас недоступен. Попробуйте позже.' });
  }
}

async function tmdbImage(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();

  const path = req.path;
  if (!IMG_PATH_RE.test(path)) return res.status(404).end();

  const send = (entry) => {
    res.set('Content-Type', entry.type);
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    // Картинки показываются на сайте с другого адреса (фронтенд и API на разных доменах)
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(200).send(entry.body);
  };

  const cached = imgCache.get(path);
  if (cached) return send(cached);

  try {
    const upstream = await fetch(`${TMDB_IMG}${path}`, { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 502).end();
    const body = Buffer.from(await upstream.arrayBuffer());
    const entry = { type: upstream.headers.get('content-type') || 'image/jpeg', body };
    imgCache.set(path, entry, 24 * 60 * 60 * 1000, body.length);
    send(entry);
  } catch (error) {
    console.error('Ошибка загрузки картинки TMDB:', path, error.message);
    res.status(502).end();
  }
}

module.exports = {
  tmdbApiProxy: [apiLimiter, tmdbApi],
  tmdbImageProxy: [imgLimiter, tmdbImage],
};
