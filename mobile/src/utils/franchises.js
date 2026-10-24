// Коллекции TMDB: фильмы одной серии («Миссия невыполнима», «Гарри Поттер»).
// Порядок — по дате выхода: порядка «по сюжету» в TMDB нет.
// Копия чистой логики из client/src/utils/franchises.js.

// «Миссия невыполнима (Коллекция)» → «Миссия невыполнима»
export const collectionName = (name = "") =>
  name.replace(/\s*[([]?\s*(коллекция|collection|фильмы|серия фильмов)\s*[)\]]?\s*$/i, "").trim() || name;

const journalKey = (m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`;

// Записи журнала по ключу «movie-123»
export const journalIndex = (movies) => new Map(movies.map((m) => [journalKey(m), m]));

// Части коллекции с отметками из журнала и прогресс по вышедшим частям.
// next — первая непросмотренная вышедшая часть после последней просмотренной.
export function collectionProgress(collection, journal) {
  const today = new Date().toISOString().slice(0, 10);
  const parts = (collection?.parts || [])
    .filter((p) => !p.media_type || p.media_type === "movie")
    .map((p) => ({
      ...p,
      released: Boolean(p.release_date) && p.release_date <= today,
      entry: journal.get(`movie-${p.id}`) || null,
    }))
    // Без даты — ещё не анонсированы толком, ставим в конец
    .sort((a, b) => (a.release_date || "9999").localeCompare(b.release_date || "9999"));

  const released = parts.filter((p) => p.released);
  const isWatched = (p) => p.entry?.status === "WATCHED";
  const watched = released.filter(isWatched).length;
  const lastWatched = released.reduce((last, p, i) => (isWatched(p) ? i : last), -1);
  const next =
    released.slice(lastWatched + 1).find((p) => !isWatched(p)) || released.find((p) => !isWatched(p)) || null;

  return {
    id: collection?.id,
    name: collectionName(collection?.name),
    parts,
    total: released.length,
    watched,
    next,
    done: released.length > 0 && watched === released.length,
  };
}

// Начатые франшизы (collections — массив коллекций TMDB): хотя бы одна часть просмотрена,
// вышедших частей больше одной.
// Недосмотренные — первыми, внутри — по доле просмотренного.
export function startedFranchises(collections, movies) {
  const journal = journalIndex(movies);
  return collections
    .map((c) => collectionProgress(c, journal))
    .filter((p) => p.total > 1 && p.watched > 0)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.watched / b.total - a.watched / a.total);
}
