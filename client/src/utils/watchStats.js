import { useEffect, useState } from "react";
import { fetchTmdb } from "./tmdb";

// Длительность в журнале не хранится: берём её из TMDB и кэшируем в браузере.
// Заодно запоминаем коллекцию фильма (франшизу) — она нужна профилю.
// Для сериала без отмеченных серий считаем весь сериал: число серий × длина серии.
// Если серии отмечены, точное время приходит с сервера (episodeMinutes).
const CACHE_KEY = "mg-movie-meta-v2";
const PARALLEL = 4;

const keyOf = (m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`;

// Сериал, у которого отмечены отдельные серии
export const hasEpisodes = (m) => m.mediaType === "tv" && m.episodesWatched > 0;

// Записи, которые дают время просмотра: просмотренное и начатые сериалы
export const timeEntries = (movies) =>
  movies.filter((m) => m.status === "WATCHED" || hasEpisodes(m));

function minutesOf(m, runtimes) {
  if (hasEpisodes(m)) return m.episodeMinutes || 0;
  return m.status === "WATCHED" ? runtimes[keyOf(m)] || 0 : 0;
}

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

// Старый кэш (только минуты) больше не нужен
try {
  localStorage.removeItem("mg-runtime-v1");
} catch {
  // Хранилище недоступно — ничего страшного
}

function minutesFromDetails(data, type) {
  if (!data) return 0;
  if (type === "movie") return data.runtime || 0;
  const episode = data.episode_run_time?.[0] || data.last_episode_to_air?.runtime || 0;
  return episode * (data.number_of_episodes || 0);
}

// Для всех просмотренных записей по ключу «movie-123» / «tv-456»:
// runtimes — минуты просмотра, collections — id коллекции TMDB (если фильм из серии)
export function useRuntimes(movies) {
  const [meta, setMeta] = useState(readCache);

  const missingKey = movies
    .filter((m) => m.status === "WATCHED" && m.tmdbId && meta[keyOf(m)] === undefined)
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
          found[key] = {
            m: minutesFromDetails(res?.data, res?.type || type),
            c: res?.data?.belongs_to_collection?.id || null,
          };
        } catch {
          // Не удалось получить — посчитаем как 0, чтобы не запрашивать бесконечно
          found[key] = { m: 0, c: null };
        }
      }
    };

    Promise.all(Array.from({ length: PARALLEL }, worker)).then(() => {
      if (cancelled) return;
      setMeta((prev) => {
        const next = { ...prev, ...found };
        writeCache(next);
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  const runtimes = {};
  const collections = {};
  for (const [key, value] of Object.entries(meta)) {
    runtimes[key] = value.m;
    if (value.c) collections[key] = value.c;
  }
  // Пока есть записи без длительности, данные ещё догружаются
  return { runtimes, collections, loading: Boolean(missingKey) };
}

export const watchedDate = (m) => (m.watchedAt ? new Date(m.watchedAt) : null);

export const isThisMonth = (date, now = new Date()) =>
  !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();

// Сводка: минуты по всем записям, а фильмы и сериалы — только досмотренные
export function summarize(entries, runtimes) {
  let minutes = 0;
  let films = 0;
  let series = 0;
  for (const m of entries) {
    minutes += minutesOf(m, runtimes);
    if (m.status !== "WATCHED") continue;
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
