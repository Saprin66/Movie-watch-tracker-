import { useQuery } from "@tanstack/react-query";
import { fetchDetails } from "./tmdb";

// Длительность в журнале не хранится: берём её из TMDB и помним до перезапуска.
// Для сериала без отмеченных серий считаем весь сериал: число серий × длина серии.
// Если серии отмечены, точное время приходит с сервера (episodeMinutes).
// Заодно запоминаем коллекцию фильма (франшизу) — она нужна профилю.
const PARALLEL = 4;
const meta = new Map(); // «movie-123» → { minutes, collection }

const keyOf = (m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`;
const hasEpisodes = (m) => m.mediaType === "tv" && m.episodesWatched > 0;

function minutesFromDetails(data, type) {
  if (!data) return 0;
  if (type === "movie") return data.runtime || 0;
  const episode = data.episode_run_time?.[0] || data.last_episode_to_air?.runtime || 0;
  return episode * (data.number_of_episodes || 0);
}

async function loadMeta(keys) {
  const queue = [...keys];
  const worker = async () => {
    while (queue.length) {
      const key = queue.shift();
      const [type, id] = key.split("-");
      try {
        const found = await fetchDetails(type, id);
        meta.set(key, {
          minutes: minutesFromDetails(found?.data, found?.type || type),
          collection: found?.data?.belongs_to_collection?.id || null,
        });
      } catch {
        // Не удалось получить — считаем как 0, чтобы не запрашивать бесконечно
        meta.set(key, { minutes: 0, collection: null });
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return keys.length;
}

// По журналу (свой или друга): всего минут просмотра — просмотренное и начатые сериалы,
// и id коллекций TMDB у просмотренных фильмов
export function useWatchMinutes(movies = []) {
  const entries = movies.filter((m) => m.status === "WATCHED" || hasEpisodes(m));
  const missing = movies
    .filter((m) => m.status === "WATCHED" && m.tmdbId && !meta.has(keyOf(m)))
    .map(keyOf);
  const { isFetching } = useQuery({
    queryKey: ["runtimes", missing.join(",")],
    queryFn: () => loadMeta(missing),
    enabled: missing.length > 0,
    staleTime: Infinity,
  });

  const minutes = entries.reduce(
    (sum, m) => sum + (hasEpisodes(m) ? m.episodeMinutes || 0 : meta.get(keyOf(m))?.minutes || 0),
    0,
  );
  const collections = movies
    .filter((m) => m.status === "WATCHED")
    .map((m) => meta.get(keyOf(m))?.collection)
    .filter(Boolean);
  return { minutes, collections, loading: isFetching || missing.length > 0 };
}
