export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
if (!TMDB_API_KEY) {
  console.error(
    "Не задан VITE_TMDB_API_KEY: поиск и импорт фильмов работать не будут. См. client/.env.example",
  );
}
export const TMDB = "https://api.themoviedb.org/3";
export const POSTER = "https://image.tmdb.org/t/p/w300";
export const BACKDROP = "https://image.tmdb.org/t/p/w1280";
