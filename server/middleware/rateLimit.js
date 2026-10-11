// Простой ограничитель частоты запросов в памяти процесса, без внешних пакетов.
// Подходит для одного экземпляра сервера; при нескольких экземплярах лимиты считаются отдельно.

function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, Math.min(windowMs, 60 * 1000));
  cleanup.unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        error: message || 'Слишком много запросов. Попробуйте позже.'
      });
    }

    next();
  };
}

module.exports = { rateLimit };
