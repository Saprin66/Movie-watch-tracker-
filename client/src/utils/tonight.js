// «Что посмотреть сегодня?»: ответы на вопросы превращаются в запрос к TMDB,
// а реакции в колоде свайпов подстраивают порядок оставшихся карточек.
import { TMDB, TMDB_API_KEY } from "../config";
import { fetchTmdb, fetchWithRetry, hasRussianTranslation } from "./tmdb";
import { genreName } from "./genres";
import { keyOf } from "./recommendations";

// Жанры TMDB под настроение. У фильмов и сериалов разные id жанров.
// «|» в запросе TMDB — «любой из», «,» — «все сразу».
export const MOODS = [
  { id: "laugh", label: "Посмеяться", icon: "laugh", movie: "35", tv: "35", without: "27,53" },
  { id: "tense", label: "Понервничать", icon: "zap", movie: "53|27|9648", tv: "80|9648" },
  { id: "touch", label: "Растрогаться", icon: "heart", movie: "18|10749", tv: "18", without: "27" },
  { id: "think", label: "Подумать", icon: "brain", movie: "878|9648|99", tv: "10765|99|9648", minRating: 7.2 },
  { id: "relax", label: "Отключить мозг", icon: "popcorn", movie: "28|12|14", tv: "10759|16" },
];

export const TIMES = [
  { id: "short", label: "До полутора часов", icon: "timer", runtime: { lte: 100 } },
  { id: "long", label: "Пара часов", icon: "clock", runtime: { gte: 90, lte: 150 } },
  { id: "series", label: "Пару серий сериала", icon: "tv", tv: true },
  { id: "any", label: "Неважно", icon: "infinity" },
];

export const SOURCES = [
  { id: "new", label: "Что-то новое", icon: "sparkles" },
  { id: "mine", label: "Из моего списка", icon: "bookmark" },
];

export const DECK_SIZE = 15;
export const LIKES_TO_FINISH = 4;

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Запрос подборки TMDB по ответам
function discoverUrl({ mood, time, kids }, page) {
  const m = MOODS.find((x) => x.id === mood);
  const t = TIMES.find((x) => x.id === time);
  const type = t?.tv ? "tv" : "movie";
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: "ru-RU",
    sort_by: "popularity.desc",
    "vote_count.gte": "150",
    page: String(page),
  });
  if (m) params.set("with_genres", type === "tv" ? m.tv : m.movie);
  const without = [m?.without, kids && type === "movie" ? "27,53,10749" : null].filter(Boolean).join(",");
  if (without) params.set("without_genres", without);
  if (m?.minRating) params.set("vote_average.gte", String(m.minRating));
  if (t?.runtime?.lte) params.set("with_runtime.lte", String(t.runtime.lte));
  if (t?.runtime?.gte) params.set("with_runtime.gte", String(t.runtime.gte));
  if (kids && type === "movie") {
    // Возрастной рейтинг США: G и PG — то, что можно смотреть с детьми
    params.set("certification_country", "US");
    params.set("certification.lte", "PG");
  }
  if (kids && type === "tv") params.set("with_genres", "10762|16|10751");
  return { url: `${TMDB}/discover/${type}?${params}`, type };
}

// Новые фильмы: несколько случайных страниц популярного под ответы
async function newCandidates(answers, journal, exclude) {
  const journalKeys = new Set(journal.map((m) => keyOf(m.mediaType, m.tmdbId)));
  const pages = shuffle([1, 2, 3, 4, 5]).slice(0, 2);
  const lists = await Promise.all(
    pages.map(async (page) => {
      const { url, type } = discoverUrl(answers, page);
      const res = await fetchWithRetry(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((item) => ({ ...item, media_type: type }));
    }),
  );
  const seen = new Set();
  return shuffle(
    lists.flat().filter((item) => {
      const key = keyOf(item.media_type, item.id);
      if (seen.has(key) || journalKeys.has(key) || exclude.has(key)) return false;
      seen.add(key);
      return item.poster_path && hasRussianTranslation(item);
    }),
  ).slice(0, DECK_SIZE);
}

// Из «Буду смотреть»: подходящие по жанру и времени записи журнала.
// Описание, рейтинг и длительность берём из TMDB.
async function watchlistCandidates({ mood, time }, journal, exclude) {
  const m = MOODS.find((x) => x.id === mood);
  const t = TIMES.find((x) => x.id === time);
  const wantType = t?.tv ? "tv" : t && t.id !== "any" ? "movie" : null;
  const moodNames = new Set(
    [m?.movie, m?.tv]
      .filter(Boolean)
      .flatMap((ids) => ids.split("|"))
      .map((id) => genreName(Number(id)))
      .filter(Boolean),
  );

  let pool = journal.filter(
    (e) =>
      e.status === "WATCHLIST" &&
      e.tmdbId &&
      !exclude.has(keyOf(e.mediaType, e.tmdbId)) &&
      (!wantType || (e.mediaType === "tv" ? "tv" : "movie") === wantType),
  );
  // Сначала подходящие по настроению; если таких нет — весь список
  const byMood = pool.filter((e) => (e.genres || []).some((g) => moodNames.has(g)));
  if (byMood.length) pool = byMood;

  const picked = shuffle(pool).slice(0, DECK_SIZE + 5);
  const details = await Promise.all(
    picked.map((e) =>
      fetchTmdb(e.mediaType, e.tmdbId, "", "&language=ru-RU")
        .then((found) =>
          found
            ? {
                ...found.data,
                media_type: found.type,
                genre_ids: (found.data.genres || []).map((g) => g.id),
                runtime: found.data.runtime || found.data.episode_run_time?.[0] || null,
                journalId: e.id,
              }
            : null,
        )
        .catch(() => null),
    ),
  );
  return details
    .filter(Boolean)
    .filter((item) => {
      if (!t?.runtime || !item.runtime || item.media_type === "tv") return true;
      return (!t.runtime.lte || item.runtime <= t.runtime.lte + 10) && (!t.runtime.gte || item.runtime >= t.runtime.gte - 10);
    })
    .slice(0, DECK_SIZE);
}

export async function loadCandidates(answers, journal, exclude = new Set()) {
  return answers.source === "mine"
    ? watchlistCandidates(answers, journal, exclude)
    : newCandidates(answers, journal, exclude);
}

// Подстройка колоды: жанры понравившихся поднимаются выше, а жанры, которые
// отвергли дважды и ни разу не выбрали, опускаются в конец
export function reorderDeck(rest, liked, rejected) {
  const likedGenres = new Map();
  for (const item of liked) for (const g of item.genre_ids || []) likedGenres.set(g, (likedGenres.get(g) || 0) + 1);
  const rejectedGenres = new Map();
  for (const item of rejected) for (const g of item.genre_ids || []) rejectedGenres.set(g, (rejectedGenres.get(g) || 0) + 1);

  const score = (item) =>
    (item.genre_ids || []).reduce((sum, g) => {
      const plus = likedGenres.get(g) || 0;
      const minus = rejectedGenres.get(g) || 0;
      return sum + plus * 2 - (minus >= 2 && !plus ? minus * 1.5 : 0);
    }, 0);

  return rest
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.item);
}

export const titleOf = (item) => item.title || item.name || "";
export const yearOf = (item) => (item.release_date || item.first_air_date || "").slice(0, 4);
export const genresOf = (item) =>
  (item.genre_ids || []).map((id) => genreName(id)).filter(Boolean).slice(0, 3);
