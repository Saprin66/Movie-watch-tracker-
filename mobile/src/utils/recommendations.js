export const keyOf = (type, id) => `${type === "tv" ? "tv" : "movie"}-${id}`;

// Выбирает до `count` опорных фильмов для рекомендаций: сначала просмотренные
// с оценкой 8 и выше; если таких нет, лучшие из просмотренных.
export function pickSeeds(movies, count = 3, random = Math.random) {
  const watched = movies.filter((m) => m.status === "WATCHED");
  let pool = watched.filter((m) => (m.rating ?? 0) >= 8);
  if (pool.length === 0) {
    pool = [...watched]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5);
  }

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// lists: [{ seed, results }], где results ответ TMDB /recommendations.
// Чем больше опорных фильмов рекомендуют картину, тем выше она в списке.
export function mergeRecommendations(lists) {
  const merged = new Map();

  for (const { seed, results } of lists) {
    const seedType = seed.mediaType === "tv" ? "tv" : "movie";
    for (const item of results || []) {
      if (!item.poster_path) continue;
      const mediaType =
        item.media_type === "tv" || item.media_type === "movie"
          ? item.media_type
          : seedType;
      const key = keyOf(mediaType, item.id);
      const entry = merged.get(key) || {
        key,
        item: { ...item, media_type: mediaType },
        votes: 0,
      };
      entry.votes += 1;
      merged.set(key, entry);
    }
  }

  return [...merged.values()].sort(
    (a, b) =>
      b.votes - a.votes ||
      (b.item.vote_average || 0) - (a.item.vote_average || 0),
  );
}
