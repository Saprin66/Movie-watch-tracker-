import { useEffect, useState } from "react";
import { TMDB, TMDB_API_KEY } from "../config";
import { fetchWithRetry } from "./tmdb";

// Коллекции TMDB: фильмы одной серии («Миссия невыполнима», «Гарри Поттер»).
// Порядок — по дате выхода: порядка «по сюжету» в TMDB нет.

const CACHE_KEY = "mg-collections-v1";
const CACHE_DAYS = 7;
const PARALLEL = 4;

// «Миссия невыполнима (Коллекция)» → «Миссия невыполнима»
export const collectionName = (name = "") =>
  name.replace(/\s*[([]?\s*(коллекция|collection|фильмы|серия фильмов)\s*[)\]]?\s*$/i, "").trim() || name;

const journalKey = (m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`;

// Записи журнала по ключу «movie-123»
export const journalIndex = (movies) => new Map(movies.map((m) => [journalKey(m), m]));

// Части коллекции с отметками из журнала и прогресс по вышедшим частям.
// next — первая непросмотренная вышедшая часть после последней просмотренной.
export function collectionProgress(collection, journal) {
  const today = new Date().toISOString().slice(0, 10);
  const parts = (collection?.parts || [])
    .filter((p) => !p.media_type || p.media_type === "movie")
    .map((p) => ({
      ...p,
      released: Boolean(p.release_date) && p.release_date <= today,
      entry: journal.get(`movie-${p.id}`) || null,
    }))
    // Без даты — ещё не анонсированы толком, ставим в конец
    .sort((a, b) => (a.release_date || "9999").localeCompare(b.release_date || "9999"));

  const released = parts.filter((p) => p.released);
  const isWatched = (p) => p.entry?.status === "WATCHED";
  const watched = released.filter(isWatched).length;
  const lastWatched = released.reduce((last, p, i) => (isWatched(p) ? i : last), -1);
  const next =
    released.slice(lastWatched + 1).find((p) => !isWatched(p)) || released.find((p) => !isWatched(p)) || null;

  return {
    id: collection?.id,
    name: collectionName(collection?.name),
    parts,
    total: released.length,
    watched,
    next,
    done: released.length > 0 && watched === released.length,
  };
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

const fresh = (item) => item && Date.now() - item.savedAt < CACHE_DAYS * 24 * 3600 * 1000;

// Нужны только поля, которые показываем: так кэш остаётся маленьким
const slim = (data) => ({
  id: data.id,
  name: data.name,
  parts: (data.parts || []).map((p) => ({
    id: p.id,
    title: p.title,
    media_type: p.media_type,
    release_date: p.release_date,
    poster_path: p.poster_path,
    genre_ids: p.genre_ids,
  })),
});

export async function loadCollection(id) {
  const cached = readCache()[id];
  if (fresh(cached)) return cached.data;
  const res = await fetchWithRetry(`${TMDB}/collection/${id}?api_key=${TMDB_API_KEY}&language=ru-RU`);
  if (!res.ok) throw new Error(`TMDB ответил ${res.status}`);
  const data = slim(await res.json());
  writeCache({ ...readCache(), [id]: { data, savedAt: Date.now() } });
  return data;
}

// Коллекция по id: { collection, loading, error }
export function useCollection(id) {
  const [state, setState] = useState({ id: null, collection: null, error: "" });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadCollection(id)
      .then((collection) => !cancelled && setState({ id, collection, error: "" }))
      .catch((error) => !cancelled && setState({ id, collection: null, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const current = state.id === id;
  return {
    collection: current ? state.collection : null,
    error: current ? state.error : "",
    loading: Boolean(id) && !current,
  };
}

// Коллекции по списку id (для профиля): { [id]: коллекция }
export function useCollections(ids) {
  const key = [...new Set(ids)].sort().join(",");
  const [loaded, setLoaded] = useState({});

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const queue = key.split(",");
    const found = {};
    const worker = async () => {
      while (queue.length && !cancelled) {
        const id = queue.shift();
        try {
          found[id] = await loadCollection(id);
        } catch {
          // Не загрузилась — просто не показываем эту франшизу
        }
      }
    };
    Promise.all(Array.from({ length: PARALLEL }, worker)).then(() => {
      if (!cancelled) setLoaded((prev) => ({ ...prev, ...found }));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return loaded;
}

// Начатые франшизы: хотя бы одна часть просмотрена, вышедших частей больше одной.
// Недосмотренные — первыми, внутри — по доле просмотренного.
export function startedFranchises(collections, movies) {
  const journal = journalIndex(movies);
  return Object.values(collections)
    .map((c) => collectionProgress(c, journal))
    .filter((p) => p.total > 1 && p.watched > 0)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.watched / b.total - a.watched / a.total);
}
