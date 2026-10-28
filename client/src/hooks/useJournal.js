import { useCallback, useRef, useState } from "react";
import { API_URL } from "../config";
import { tmdbToEntry } from "../utils/journal";

// Журнал пользователя: список записей и запросы, которые его меняют.
// После каждого изменения список перезагружается с сервера.
export function useJournal(token) {
  const [movies, setMovies] = useState([]);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchMovies = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setMovies(list);
      return list;
    } catch (error) {
      console.error("Ошибка загрузки фильмов:", error);
      return null;
    }
  }, [token]);

  // Возвращает запись из журнала (или null), чтобы можно было сразу открыть отзыв.
  // 409 значит, что фильм уже в журнале (например, после двойного нажатия, пока
  // список ещё не обновился) — тогда возвращаем уже существующую запись.
  const addMovie = async (movie) => {
    try {
      const res = await fetch(`${API_URL}/api/movies`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(movie),
      });
      const created = res.ok ? await res.json().catch(() => null) : null;
      const list = await fetchMovies();
      if (res.status === 409) {
        return (list || []).find(
          (m) => m.tmdbId === movie.tmdbId && m.mediaType === movie.mediaType,
        ) || null;
      }
      return created;
    } catch (error) {
      console.error("Ошибка добавления:", error);
      return null;
    }
  };

  // Несколько фильмов в «Буду смотреть» разом (части коллекции), журнал обновляем один раз
  const addToWatchlist = async (items) => {
    for (const item of items) {
      try {
        await fetch(`${API_URL}/api/movies`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(tmdbToEntry({ ...item, media_type: "movie" }, "WATCHLIST")),
        });
      } catch (error) {
        console.error("Ошибка добавления:", error);
      }
    }
    await fetchMovies();
  };

  const deleteMovie = async (id) => {
    try {
      await fetch(`${API_URL}/api/movies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMovies();
    } catch (error) {
      console.error("Ошибка удаления:", error);
    }
  };

  const updateMovieStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/movies/${id}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      await fetchMovies();
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
    }
  };

  const saveReview = async (id, { rating, comment }) => {
    try {
      const res = await fetch(`${API_URL}/api/movies/${id}/review`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Не удалось сохранить отзыв" };
      }
      await fetchMovies();
      return { ok: true };
    } catch (error) {
      console.error("Ошибка сохранения отзыва:", error);
      return { ok: false, error: "Ошибка соединения с сервером" };
    }
  };

  // Отметить серии сериала просмотренными
  const markEpisodes = async (id, episodes) => {
    try {
      const res = await fetch(`${API_URL}/api/movies/${id}/episodes`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ episodes, watched: true }),
      });
      await fetchMovies();
      return res.ok;
    } catch (error) {
      console.error("Ошибка отметки серий:", error);
      return false;
    }
  };

  // Записи, по которым запрос ещё идёт: повторное нажатие в это время игнорируем,
  // иначе второй запрос уйдёт со старым состоянием журнала
  const pending = useRef(new Set());
  const once = async (key, action) => {
    if (pending.current.has(key)) return;
    pending.current.add(key);
    try {
      await action();
    } finally {
      pending.current.delete(key);
    }
  };

  // Записи, которым дозаполнили год и жанры
  const patchMovie = useCallback(
    (updated) => setMovies((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))),
    [],
  );

  return {
    movies,
    setMovies,
    patchMovie,
    fetchMovies,
    addMovie,
    addToWatchlist,
    deleteMovie,
    updateMovieStatus,
    saveReview,
    markEpisodes,
    once,
  };
}
