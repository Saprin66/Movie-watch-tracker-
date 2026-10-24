import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";
import { POSTER } from "./config";
import { metaFromTmdb } from "../utils/genres";

const KEY = ["movies"];

// Журнал пользователя: все его фильмы и сериалы
export function useMovies() {
  const { token } = useAuth();
  return useQuery({
    queryKey: KEY,
    queryFn: () => api("/api/movies", { token }),
    enabled: Boolean(token),
  });
}

// Запись журнала для фильма из TMDB (или undefined, если его там нет)
export function findInJournal(movies, tmdbId, mediaType) {
  return (movies || []).find(
    (m) => m.tmdbId === Number(tmdbId) && (m.mediaType === "tv" ? "tv" : "movie") === mediaType,
  );
}

// Действия с журналом. После каждого журнал перезагружается с сервера.
export function useMovieActions() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  return {
    // item: фильм из TMDB (поиск или карточка), type: "movie" | "tv"
    add: async (item, type, status) => {
      await api("/api/movies", {
        token,
        method: "POST",
        body: {
          tmdbId: item.id,
          title: item.title || item.name,
          posterUrl: item.poster_path ? `${POSTER}${item.poster_path}` : null,
          mediaType: type,
          status,
          ...metaFromTmdb(item),
        },
      });
      await refresh();
    },
    // Несколько фильмов разом (части коллекции), журнал обновляем один раз
    addMany: async (items, type, status) => {
      for (const item of items) {
        await api("/api/movies", {
          token,
          method: "POST",
          body: {
            tmdbId: item.id,
            title: item.title || item.name,
            posterUrl: item.poster_path ? `${POSTER}${item.poster_path}` : null,
            mediaType: type,
            status,
            ...metaFromTmdb(item),
          },
        }).catch(() => {}); // уже в журнале или сбой — остальные всё равно добавляем
      }
      await refresh();
    },
    remove: async (id) => {
      await api(`/api/movies/${id}`, { token, method: "DELETE" });
      await refresh();
    },
    setStatus: async (id, status) => {
      await api(`/api/movies/${id}/status`, { token, method: "PUT", body: { status } });
      await refresh();
    },
    saveReview: async (id, { rating, comment }) => {
      await api(`/api/movies/${id}/review`, { token, method: "PUT", body: { rating, comment } });
      await refresh();
    },
  };
}
