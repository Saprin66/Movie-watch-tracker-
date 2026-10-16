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
