// Сборка ленты активности друзей из последних изменённых записей.
//
// Импорт списка создаёт десятки записей за минуту. Чтобы они не заняли всю ленту,
// подряд идущие записи одного друга с одним статусом (интервал не больше 10 минут)
// склеиваются в одну запись, если их набралось 4 и больше.

const GAP_MS = 10 * 60 * 1000;
const BULK_MIN = 4;
const BULK_PREVIEW = 6;

const toMovie = (row) => ({
  tmdbId: row.tmdbId,
  title: row.title,
  posterUrl: row.posterUrl,
  mediaType: row.mediaType
});

// rows: записи UserMovie с полем user { id, username }, отсортированные по updatedAt по убыванию
function buildFeed(rows, limit = 40) {
  const groups = [];
  const open = new Map();

  for (const row of rows) {
    const key = `${row.user.id}|${row.status}`;
    const time = row.updatedAt.getTime();
    const group = open.get(key);

    if (group && group.lastTime - time <= GAP_MS) {
      group.rows.push(row);
      group.lastTime = time;
    } else {
      const created = { rows: [row], lastTime: time };
      open.set(key, created);
      groups.push(created);
    }
  }

  const items = [];
  for (const group of groups) {
    const first = group.rows[0];

    if (group.rows.length >= BULK_MIN) {
      items.push({
        type: 'bulk',
        id: `bulk-${first.id}`,
        user: first.user,
        status: first.status,
        count: group.rows.length,
        movies: group.rows.slice(0, BULK_PREVIEW).map(toMovie),
        at: first.updatedAt
      });
    } else {
      for (const row of group.rows) {
        items.push({
          type: 'movie',
          id: row.id,
          user: row.user,
          status: row.status,
          rating: row.rating,
          comment: row.comment,
          movie: toMovie(row),
          at: row.updatedAt
        });
      }
    }
  }

  // Порядок по времени; при равенстве сохраняется исходный (сортировка устойчивая)
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}

module.exports = { buildFeed, GAP_MS, BULK_MIN };
