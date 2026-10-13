import { useEffect, useRef } from "react";
import { API_URL, TMDB_API_KEY } from "../config";
import { fetchTmdb } from "../utils/tmdb";
import { metaFromTmdb } from "../utils/genres";

const CHUNK = 4;
const PAUSE_MS = 300;

// Старые записи появились до фильтров и не знают свой год и жанры. Пока человек
// пользуется приложением, дозаполняем их по несколько штук за раз.
// Заодно исправляется тип (фильм или сериал), если он был записан неверно.
export function useMetaBackfill({ movies, token, onUpdated }) {
  const latest = useRef(movies);
  const tried = useRef(new Set());
  const running = useRef(null); // текущий запуск, чтобы старый не мешал новому
  const onUpdatedRef = useRef(onUpdated);

  useEffect(() => {
    latest.current = movies;
    onUpdatedRef.current = onUpdated;
  });

  const hasPending = movies.some((m) => m.id && !m.metaCheckedAt);

  useEffect(() => {
    if (!token || !TMDB_API_KEY || !hasPending || running.current) return;

    let cancelled = false;
    const run = {};
    running.current = run;

    const next = () =>
      latest.current
        .filter((m) => m.id && !m.metaCheckedAt && !tried.current.has(m.id))
        .slice(0, CHUNK);

    const processOne = async (movie) => {
      tried.current.add(movie.id);
      try {
        const found = await fetchTmdb(movie.mediaType, movie.tmdbId);
        // Если TMDB не знает такую запись, всё равно помечаем её проверенной
        const body = found
          ? { ...metaFromTmdb(found.data), mediaType: found.type }
          : { releaseYear: null, genres: [] };

        const res = await fetch(`${API_URL}/api/movies/${movie.id}/meta`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        // Ответ применяем даже после отмены цикла: на сервере запись уже обновлена
        if (res.ok) onUpdatedRef.current(await res.json());
      } catch (error) {
        // Сеть или лимит TMDB: попробуем в следующий раз
        console.warn("Не удалось дозаполнить данные фильма:", error.message);
      }
    };

    (async () => {
      try {
        let chunk = next();
        while (chunk.length > 0 && !cancelled) {
          await Promise.all(chunk.map(processOne));
          await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
          chunk = next();
        }
      } finally {
        if (running.current === run) running.current = null;
      }
    })();

    return () => {
      cancelled = true;
      if (running.current === run) running.current = null;
    };
  }, [token, hasPending]);
}
