import { POSTER } from "../config";
import { metaFromTmdb } from "./genres";

export const mediaTypeOf = (item) => (item.media_type === "tv" ? "tv" : "movie");

// Ключ «тип-id», по которому фильм из TMDB сопоставляется с записью журнала
export const entryKey = (entry) => `${entry.mediaType === "tv" ? "tv" : "movie"}-${entry.tmdbId}`;

// Запись из результата TMDB для добавления в журнал
export const tmdbToEntry = (movie, status) => ({
  tmdbId: movie.id,
  title: movie.title || movie.name,
  posterUrl: movie.poster_path ? `${POSTER}${movie.poster_path}` : null,
  status,
  mediaType: mediaTypeOf(movie),
  ...metaFromTmdb(movie),
});

// Запись журнала в том виде, в каком страница фильма открывает фильм из TMDB
export const entryToMovie = (entry) => ({
  id: entry.tmdbId,
  media_type: entry.mediaType,
  title: entry.title,
  posterUrl: entry.posterUrl,
});

export const findEntry = (movies, movie) =>
  movies.find((m) => m.tmdbId === movie.id && m.mediaType === mediaTypeOf(movie));
