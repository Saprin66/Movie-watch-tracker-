import { POSTER } from "./config";

// Данные фильма TMDB или записи журнала в формате, который ждёт сервер общих списков
export function itemFromTmdb(movie) {
  const mediaType = movie.media_type === "tv" || movie.mediaType === "tv" ? "tv" : "movie";
  const year = Number(
    (movie.release_date || movie.first_air_date || "").slice(0, 4) || movie.releaseYear || movie.year,
  );
  return {
    tmdbId: Number(movie.tmdbId ?? movie.id),
    mediaType,
    title: movie.title || movie.name,
    posterUrl: movie.posterUrl || (movie.poster_path ? `${POSTER}${movie.poster_path}` : null),
    releaseYear: Number.isInteger(year) && year > 0 ? year : null,
  };
}
