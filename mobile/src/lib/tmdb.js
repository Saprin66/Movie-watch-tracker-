import { TMDB, TMDB_API_KEY } from "./config";

// Сетевой сбой даёт TypeError. Такой запрос повторяем один раз через секунду.
async function fetchWithRetry(url, retries = 1) {
  try {
    return await fetch(url);
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetchWithRetry(url, retries - 1);
  }
}

// GET-запрос к TMDB. params: объект с параметрами запроса.
export async function tmdb(path, params = {}) {
  if (!TMDB_API_KEY) throw new Error("Не настроен ключ TMDB (EXPO_PUBLIC_TMDB_API_KEY)");
  const query = new URLSearchParams({ api_key: TMDB_API_KEY, language: "ru-RU", ...params });
  const res = await fetchWithRetry(`${TMDB}${path}?${query}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.status_message || `TMDB ответил ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Карточка фильма или сериала. Старые записи журнала могли сохраниться как
// «фильм», даже если это сериал, поэтому при 404 пробуем второй тип.
export async function fetchDetails(type, id) {
  const first = type === "tv" ? "tv" : "movie";
  const other = first === "tv" ? "movie" : "tv";
  for (const t of [first, other]) {
    try {
      const data = await tmdb(`/${t}/${id}`, {
        append_to_response: "credits,videos",
        include_video_language: "ru,en,null",
      });
      return { data, type: t };
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  return null;
}
