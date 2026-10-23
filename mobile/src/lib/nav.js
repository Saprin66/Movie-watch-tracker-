import { router } from "expo-router";

// Переходы между экранами, которые нужны из многих мест

// item: фильм из TMDB ({ id, media_type }) или запись журнала ({ tmdbId, mediaType })
export function openMovie(item) {
  const type = (item.media_type || item.mediaType) === "tv" ? "tv" : "movie";
  router.push(`/movie/${type}/${item.tmdbId ?? item.id}`);
}

export const openUser = (userId) => router.push(`/user/${userId}`);
export const openReview = (movieId) => router.push(`/review/${movieId}`);
export const openList = (listId) => router.push(`/list/${listId}`);
export const openPerson = (personId) => router.push(`/person/${personId}`);
