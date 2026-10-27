// Чистка журналов: дубликаты и записи с неверным типом (сериал сохранён как фильм).
//
// Каждая запись сверяется с TMDB: название под сохранённым типом должно совпадать
// с названием в журнале. Если совпадает только под другим типом — тип неверный.
// Разные фильмы с одинаковым названием («Оно» 1990 и 2017) не трогаются:
// у них разные id, и каждый совпадает со своим.
//
// Что делает:
//  • неверный тип и такой же записи с правильным типом нет — меняет тип;
//  • неверный тип, а правильная запись уже есть — сливает в неё и удаляет лишнюю;
//  • точные дубли (тот же id и тип) — оставляет одну, сливая оценку, отзыв,
//    статус и отмеченные серии, остальные удаляет.
// Записи, которые не совпали ни под одним типом, только показываются.
//
// Запуск из папки server (сначала без --apply, чтобы посмотреть план):
//   TMDB_API_KEY=... node scripts/fix-journal.js
//   TMDB_API_KEY=... node scripts/fix-journal.js --apply
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const apply = process.argv.includes('--apply');
const KEY = process.env.TMDB_API_KEY;
if (!KEY) {
  console.error('Нужен TMDB_API_KEY в переменных окружения');
  process.exit(1);
}
const prisma = new PrismaClient();

const norm = (t) =>
  (t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();

// Названия записи в TMDB под типом: русское и оригинальное (null — не найдено)
const titleCache = new Map();
async function tmdbTitles(type, id) {
  const key = `${type}-${id}`;
  if (titleCache.has(key)) return titleCache.get(key);
  let result = null;
  for (let attempt = 0; attempt < 3 && result === null; attempt++) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${KEY}&language=ru-RU`);
      if (res.status === 404) { result = []; break; }
      if (!res.ok) throw new Error(`TMDB ${res.status}`);
      const d = await res.json();
      result = [d.title, d.name, d.original_title, d.original_name].filter(Boolean).map(norm);
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  titleCache.set(key, result);
  return result;
}

// Сверка одной записи: 'ok' | 'wrong-type' | 'unknown' | 'error'
async function verify(row) {
  const own = await tmdbTitles(row.mediaType, row.tmdbId);
  if (own === null) return 'error';
  const title = norm(row.title);
  if (own.includes(title)) return 'ok';
  const otherType = row.mediaType === 'tv' ? 'movie' : 'tv';
  const other = await tmdbTitles(otherType, row.tmdbId);
  if (other === null) return 'error';
  return other.includes(title) ? 'wrong-type' : 'unknown';
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// Какую запись из дублей оставить: с отзывом, оценкой, просмотром, потом самую старую
const keeperScore = (r) =>
  (r.comment ? 8 : 0) + (r.rating ? 4 : 0) + (r.status === 'WATCHED' ? 2 : 0) + (r._count.episodes ? 1 : 0);

const label = (r) => `«${r.title}» [${r.mediaType} ${r.tmdbId}${r.rating ? ` ★${r.rating}` : ''}${r.comment ? ' с отзывом' : ''}]`;

// Сливает данные удаляемых записей в оставляемую и удаляет их
async function mergeInto(keeper, others) {
  const data = {};
  const all = [keeper, ...others];
  if (!keeper.rating) data.rating = all.find((r) => r.rating)?.rating ?? undefined;
  if (!keeper.comment) data.comment = all.find((r) => r.comment)?.comment ?? undefined;
  if (keeper.status !== 'WATCHED' && all.some((r) => r.status === 'WATCHED')) {
    const watched = all.find((r) => r.status === 'WATCHED');
    data.status = 'WATCHED';
    data.watchedAt = watched.watchedAt || watched.updatedAt;
  } else if (keeper.status === 'WATCHED' && !keeper.watchedAt) {
    // Дата просмотра могла остаться только у дубля
    data.watchedAt = all.find((r) => r.watchedAt)?.watchedAt ?? undefined;
  }
  // Дата добавления — самая ранняя, чтобы сортировка «по добавлению» не сдвинулась
  const earliest = all.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), keeper.createdAt);
  if (earliest < keeper.createdAt) data.createdAt = earliest;
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

  await prisma.$transaction(async (tx) => {
    // Отмеченные серии переносим, повторы пропускаем
    const have = await tx.episodeWatch.findMany({ where: { userMovieId: keeper.id }, select: { season: true, episode: true } });
    const seen = new Set(have.map((e) => `${e.season}-${e.episode}`));
    for (const other of others) {
      const eps = await tx.episodeWatch.findMany({ where: { userMovieId: other.id } });
      for (const e of eps) {
        if (seen.has(`${e.season}-${e.episode}`)) continue;
        seen.add(`${e.season}-${e.episode}`);
        await tx.episodeWatch.update({ where: { id: e.id }, data: { userMovieId: keeper.id } });
      }
    }
    if (Object.keys(data).length) {
      await tx.userMovie.update({ where: { id: keeper.id }, data: { ...data, updatedAt: keeper.updatedAt } });
    }
    await tx.userMovie.deleteMany({ where: { id: { in: others.map((r) => r.id) } } });
  });
}

(async () => {
  const rows = await prisma.userMovie.findMany({
    include: { user: { select: { username: true } }, _count: { select: { episodes: true } } },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Записей в журналах: ${rows.length}. Сверяю с TMDB…`);

  const checks = await mapLimit(rows, 8, verify);
  const byId = new Map(rows.map((r, i) => [r.id, { row: r, check: checks[i] }]));

  // Правильный тип каждой записи
  const fixedType = (r) => (byId.get(r.id).check === 'wrong-type' ? (r.mediaType === 'tv' ? 'movie' : 'tv') : r.mediaType);

  // Группы «пользователь + id + правильный тип»: всё, что в группе больше одного, — дубли
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.userId}|${r.tmdbId}|${fixedType(r)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const merges = [];
  const retypes = [];
  for (const group of groups.values()) {
    const target = fixedType(group[0]);
    if (group.length > 1) {
      // Оставляем запись с правильным типом, а среди них — самую «полную»
      const sorted = [...group].sort(
        (a, b) => (b.mediaType === target) - (a.mediaType === target) || keeperScore(b) - keeperScore(a) || a.createdAt - b.createdAt,
      );
      merges.push({ keeper: sorted[0], others: sorted.slice(1), target });
    } else if (group[0].mediaType !== target) {
      retypes.push({ row: group[0], target });
    }
  }
  // Оставляемая запись с неверным типом (правильной не было) тоже меняет тип
  for (const m of merges) if (m.keeper.mediaType !== m.target) retypes.push({ row: m.keeper, target: m.target });

  const unknown = rows.filter((r) => byId.get(r.id).check === 'unknown');
  const errors = rows.filter((r) => byId.get(r.id).check === 'error');

  console.log(`\nДубли — оставить одну запись, остальные слить и удалить: ${merges.length}`);
  for (const m of merges) {
    console.log(`  ${m.keeper.user.username}: оставить ${label(m.keeper)}, удалить ${m.others.map(label).join(', ')}`);
  }
  console.log(`\nНеверный тип — исправить: ${retypes.length}`);
  for (const t of retypes) console.log(`  ${t.row.user.username}: ${label(t.row)} → ${t.target}`);
  console.log(`\nНе совпали с TMDB ни под каким типом (не трогаю): ${unknown.length}`);
  for (const r of unknown.slice(0, 30)) console.log(`  ${r.user.username}: ${label(r)}`);
  if (unknown.length > 30) console.log(`  …и ещё ${unknown.length - 30}`);
  if (errors.length) console.log(`\nНе удалось проверить из-за ошибок TMDB: ${errors.length} (запусти ещё раз)`);

  if (!apply) {
    console.log('\nЭто пробный запуск. Чтобы применить, добавь --apply');
    return;
  }

  // Резервная копия всех затрагиваемых записей и их серий — до любых изменений
  const touched = [...merges.flatMap((m) => [m.keeper, ...m.others]), ...retypes.map((t) => t.row)];
  const ids = [...new Set(touched.map((r) => r.id))];
  const backup = {
    createdAt: new Date().toISOString(),
    userMovies: await prisma.userMovie.findMany({ where: { id: { in: ids } } }),
    episodes: await prisma.episodeWatch.findMany({ where: { userMovieId: { in: ids } } }),
  };
  const dir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `fix-journal-${backup.createdAt.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`\nРезервная копия ${ids.length} записей: ${file}`);

  for (const m of merges) await mergeInto(m.keeper, m.others);
  for (const t of retypes) {
    await prisma.userMovie.update({ where: { id: t.row.id }, data: { mediaType: t.target, updatedAt: t.row.updatedAt } });
  }
  console.log(`\nГотово: слито групп ${merges.length}, исправлен тип у ${retypes.length} записей`);
})()
  .catch((error) => {
    console.error('Ошибка:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
