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

// ---- Персональные рекомендации (Brilliant): анализ текстов отзывов ----

// Простая оценка тональности отзыва по словам-маркерам: >0 понравилось, <0 нет
const POSITIVE = [
  "шедевр", "отличн", "прекрасн", "великолепн", "потрясающ", "восторг", "люблю", "понрав",
  "супер", "класс", "круто", "крут", "лучш", "гениальн", "сильн", "атмосферн", "красив",
  "смешн", "трогательн", "захватыва", "интересн", "пересмотр", "рекоменд", "обожаю", "кайф",
];
const NEGATIVE = [
  "скучн", "ужасн", "плох", "разочаров", "слаб", "затянут", "бред", "не понрав", "ерунд",
  "отстой", "провал", "нудн", "глуп", "пустая трата", "так себе", "не зашл", "не советую",
];

export function reviewSentiment(text) {
  if (!text) return 0;
  const t = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (t.includes(w)) score += 1;
  for (const w of NEGATIVE) if (t.includes(w)) score -= 1.5;
  return Math.max(-3, Math.min(3, score));
}

// Опорные фильмы по отзывам: оценка плюс тональность текста.
// Фильмы с отрицательным отзывом не берём, даже если оценка высокая.
export function pickSeedsByReviews(movies, count = 3, random = Math.random) {
  const reviewed = movies
    .filter((m) => m.status === "WATCHED" && m.comment && m.comment.trim())
    .map((m) => ({ m, score: (m.rating ?? 6) + reviewSentiment(m.comment) * 1.5 }))
    .filter((x) => reviewSentiment(x.m.comment) >= 0)
    .sort((a, b) => b.score - a.score || random() - 0.5);
  if (reviewed.length === 0) return pickSeeds(movies, count, random);
  // Берём из лучших с небольшой случайностью, чтобы «Другая подборка» меняла выдачу
  const top = reviewed.slice(0, Math.max(count * 2, 4)).map((x) => x.m);
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  return top.slice(0, count);
}

// Насколько тебе нравится каждый жанр: по оценкам и тональности отзывов
export function genreAffinity(movies) {
  const affinity = new Map();
  for (const m of movies) {
    if (m.status !== "WATCHED" || !m.genres?.length) continue;
    const fromRating = m.rating ? (m.rating - 6) / 2 : 0;
    const weight = fromRating + reviewSentiment(m.comment);
    for (const g of m.genres) affinity.set(g, (affinity.get(g) || 0) + weight);
  }
  return affinity;
}

// Пересортировка: к голосам опорных фильмов добавляется любовь к жанрам картины
export function rerankByAffinity(list, affinity, genreNameOf) {
  const scored = list.map((entry) => {
    const names = (entry.item.genre_ids || []).map(genreNameOf).filter(Boolean);
    const bonus = names.reduce((sum, n) => sum + (affinity.get(n) || 0), 0) / Math.max(1, names.length);
    return { ...entry, score: entry.votes * 2 + bonus };
  });
  return scored.sort(
    (a, b) => b.score - a.score || (b.item.vote_average || 0) - (a.item.vote_average || 0),
  );
}
