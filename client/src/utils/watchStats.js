import { useEffect, useState } from "react";
import { fetchTmdb } from "./tmdb";

// Длительность в журнале не хранится: берём её из TMDB и кэшируем в браузере.
// Для сериала считаем весь сериал: число серий × длина серии.
const CACHE_KEY = "mg-runtime-v1";
const PARALLEL = 4;

const keyOf = (m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Хранилище недоступно (приватный режим) — просто не кэшируем
  }
}

function minutesFromDetails(data, type) {
  if (!data) return 0;
  if (type === "movie") return data.runtime || 0;
  const episode = data.episode_run_time?.[0] || data.last_episode_to_air?.runtime || 0;
  return episode * (data.number_of_episodes || 0);
}

// Минуты просмотра по ключу «movie-123» / «tv-456» для всех просмотренных записей
export function useRuntimes(movies) {
  const [runtimes, setRuntimes] = useState(readCache);

  const missingKey = movies
    .filter((m) => m.status === "WATCHED" && m.tmdbId && runtimes[keyOf(m)] === undefined)
    .map(keyOf)
    .join(",");

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    const queue = missingKey.split(",");
    const found = {};

    const worker = async () => {
      while (queue.length && !cancelled) {
        const key = queue.shift();
        const [type, id] = key.split("-");
        try {
          const res = await fetchTmdb(type, Number(id), "", "&language=ru-RU");
          found[key] = minutesFromDetails(res?.data, res?.type || type);
        } catch {
          // Не удалось получить — посчитаем как 0, чтобы не запрашивать бесконечно
          found[key] = 0;
        }
      }
    };

    Promise.all(Array.from({ length: PARALLEL }, worker)).then(() => {
      if (cancelled) return;
      setRuntimes((prev) => {
        const next = { ...prev, ...found };
        writeCache(next);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  // Пока есть записи без длительности, данные ещё догружаются
  return { runtimes, loading: Boolean(missingKey) };
}

export const watchedDate = (m) => (m.watchedAt ? new Date(m.watchedAt) : null);

export const isThisMonth = (date, now = new Date()) =>
  !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

// Сводка по просмотренным: минуты, фильмы, сериалы
export function summarize(watched, runtimes) {
  let minutes = 0;
  let films = 0;
  let series = 0;
  for (const m of watched) {
    minutes += runtimes[keyOf(m)] || 0;
    if (m.mediaType === "tv") series += 1;
    else films += 1;
  }
  return { minutes, films, series };
}

export function formatHours(minutes) {
  if (minutes < 60) return { value: String(minutes), unit: "мин" };
  const hours = minutes / 60;
  return {
    value: hours >= 100 ? String(Math.round(hours)) : hours.toFixed(1).replace(/\.0$/, ""),
    unit: "ч",
  };
}

// Жанры просмотренного по убыванию популярности
export function topGenres(watched) {
  const counts = new Map();
  for (const m of watched) {
    for (const g of m.genres || []) counts.set(g, (counts.get(g) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
