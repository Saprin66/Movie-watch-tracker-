export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Все запросы к TMDB идут через наш сервер (/api/tmdb), поэтому сайт работает,
// даже если api.themoviedb.org недоступен у провайдера пользователя.
// Ключ TMDB хранится на сервере (TMDB_API_KEY). Ключ из VITE_TMDB_API_KEY сервер
// использует, только если своего не задано. Значение "server" — просто заглушка.
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "server";
export const TMDB = `${API_URL}/api/tmdb`;

// Адреса картинок в формате TMDB: так они хранятся в базе.
// На экран они выводятся через tmdbImage(), то есть тоже через наш сервер.
export const TMDB_IMAGE_ORIGIN = "https://image.tmdb.org/t/p/";
export const POSTER = `${TMDB_IMAGE_ORIGIN}w300`;
export const POSTER_LARGE = `${TMDB_IMAGE_ORIGIN}w500`;
export const PROFILE = `${TMDB_IMAGE_ORIGIN}w185`;
export const BACKDROP = `${TMDB_IMAGE_ORIGIN}w1280`;

// Картинка TMDB через сервер: https://image.tmdb.org/t/p/w300/x.jpg → API_URL/api/img/w300/x.jpg
export function tmdbImage(url) {
  if (typeof url !== "string" || !url.startsWith(TMDB_IMAGE_ORIGIN)) return url;
  return `${API_URL}/api/img/${url.slice(TMDB_IMAGE_ORIGIN.length)}`;
}
