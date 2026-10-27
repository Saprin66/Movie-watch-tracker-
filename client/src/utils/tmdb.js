import { TMDB, TMDB_API_KEY } from "../config";

// Сетевой сбой (TMDB недоступен или соединение оборвалось) даёт TypeError.
// Такой запрос повторяем один раз через секунду: часто помогает при нестабильной связи.
export async function fetchWithRetry(url, retries = 1) {
  try {
    return await fetch(url);
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetchWithRetry(url, retries - 1);
  }
}

// Запрос к TMDB для записи из журнала. Записи, добавленные до появления поля
// mediaType, считаются фильмами, даже если это сериал. Поэтому при 404 пробуем
// второй тип. Возвращает { data, type } или null, если не нашлось ни там, ни там.
export async function fetchTmdb(type, id, suffix = "", params = "") {
  const first = type === "tv" ? "tv" : "movie";
  const other = first === "tv" ? "movie" : "tv";

  for (const t of [first, other]) {
    const res = await fetchWithRetry(
      `${TMDB}/${t}/${id}${suffix}?api_key=${TMDB_API_KEY}${params}`,
    );
    if (res.ok) return { data: await res.json(), type: t };
    if (res.status !== 404) {
      throw new Error(`TMDB ответил ${res.status}`);
    }
  }
  return null;
}

// Есть ли у фильма или сериала русский перевод. С language=ru-RU TMDB отдаёт
// русское описание и название, только если перевод есть; иначе — оригинальное
// название и пустое описание. Так отсеиваются картины, которые в России почти никто не видел.
const CYRILLIC = /[а-яё]/i;
export const hasRussianTranslation = (item) =>
  item.original_language === "ru" ||
  CYRILLIC.test(item.title || item.name || "") ||
  Boolean((item.overview || "").trim());

// На одну страницу сайта берём несколько страниц TMDB: после отсева
// непереведённых в одной странице может остаться всего несколько фильмов
export const TMDB_PAGES_PER_PAGE = 3;
const TMDB_MAX_PAGE = 500;

// urlOf(tmdbPage) → адрес запроса. Возвращает только переведённые результаты
// без повторов и число страниц сайта.
export async function fetchTranslatedPage(urlOf, page) {
  const first = (page - 1) * TMDB_PAGES_PER_PAGE + 1;
  const pages = Array.from({ length: TMDB_PAGES_PER_PAGE }, (_, i) => first + i).filter(
    (p) => p <= TMDB_MAX_PAGE,
  );
  const responses = await Promise.all(pages.map((p) => fetchWithRetry(urlOf(p))));
  const firstData = await responses[0].json();
  if (!responses[0].ok) {
    throw new Error(firstData.status_message || `TMDB ответил ${responses[0].status}`);
  }
  // Остальные страницы могут не существовать, если результатов мало
  const rest = await Promise.all(
    responses.slice(1).map((res) => (res.ok ? res.json() : { results: [] })),
  );
  const seen = new Set();
  const results = [firstData, ...rest]
    .flatMap((d) => d.results || [])
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .filter(hasRussianTranslation);
  const tmdbPages = Math.min(firstData.total_pages || 1, TMDB_MAX_PAGE);
  return { results, totalPages: Math.max(1, Math.ceil(tmdbPages / TMDB_PAGES_PER_PAGE)) };
}

// Описание фильма для карточки-строки, когда в данных его нет (записи журнала).
// Запоминаем на время сессии и грузим не больше 4 запросов одновременно,
// чтобы длинный список не завалил TMDB сотней запросов сразу.
const overviewCache = new Map();
const overviewQueue = [];
let overviewActive = 0;

const pumpOverviews = () => {
  while (overviewActive < 4 && overviewQueue.length) {
    const { key, type, id, resolve } = overviewQueue.shift();
    overviewActive += 1;
    fetchTmdb(type, id, "", "&language=ru-RU")
      .then((found) => {
        const text = (found?.data.overview || "").trim();
        overviewCache.set(key, Promise.resolve(text));
        return text;
      })
      .catch(() => {
        // Сбой сети не запоминаем: при следующем показе карточки попробуем снова
        overviewCache.delete(key);
        return "";
      })
      .then((text) => {
        resolve(text);
        overviewActive -= 1;
        pumpOverviews();
      });
  }
};

export function loadOverview(type, id) {
  const key = `${type === "tv" ? "tv" : "movie"}-${id}`;
  if (!overviewCache.has(key)) {
    overviewCache.set(
      key,
      new Promise((resolve) => {
        overviewQueue.push({ key, type, id, resolve });
        pumpOverviews();
      }),
    );
  }
  return overviewCache.get(key);
}
