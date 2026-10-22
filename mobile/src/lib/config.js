// Адреса берутся из .env (см. .env.example)
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://movie-watch-tracker.onrender.com";
export const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
if (!TMDB_API_KEY) {
  console.warn("Не задан EXPO_PUBLIC_TMDB_API_KEY: поиск фильмов работать не будет. См. .env.example");
}

export const TMDB = "https://api.themoviedb.org/3";
export const POSTER = "https://image.tmdb.org/t/p/w300";
export const POSTER_LARGE = "https://image.tmdb.org/t/p/w500";
export const PROFILE = "https://image.tmdb.org/t/p/w185";
export const BACKDROP = "https://image.tmdb.org/t/p/w1280";

// Сайт: оттуда открываем политику конфиденциальности
export const SITE_URL = "https://movie-watch-tracker.vercel.app";
export const POLICY_URL = `${SITE_URL}/#/privacy`;
