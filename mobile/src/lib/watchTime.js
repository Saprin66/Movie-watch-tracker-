import { useQuery } from "@tanstack/react-query";
import { fetchDetails } from "./tmdb";

// Длительность в журнале не хранится: берём её из TMDB и помним до перезапуска.
// Для сериала без отмеченных серий считаем весь сериал: число серий × длина серии.
// Если серии отмечены, точное время приходит с сервера (episodeMinutes).
const PARALLEL = 4;
const runtimes = new Map(); // «movie-123» → минуты

const keyOf = (m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`;
const hasEpisodes = (m) => m.mediaType === "tv" && m.episodesWatched > 0;

function minutesFromDetails(data, type) {
  if (!data) return 0;
  if (type === "movie") return data.runtime || 0;
  const episode = data.episode_run_time?.[0] || data.last_episode_to_air?.runtime || 0;
  return episode * (data.number_of_episodes || 0);
}

async function loadRuntimes(keys) {
  const queue = [...keys];
  const worker = async () => {
    while (queue.length) {
      const key = queue.shift();
      const [type, id] = key.split("-");
      try {
        const found = await fetchDetails(type, id);
        runtimes.set(key, minutesFromDetails(found?.data, found?.type || type));
      } catch {
        // Не удалось получить — считаем как 0, чтобы не запрашивать бесконечно
        runtimes.set(key, 0);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return keys.length;
}

// Всего минут просмотра по журналу: просмотренное и начатые сериалы
export function useWatchMinutes(movies = []) {
  const entries = movies.filter((m) => m.status === "WATCHED" || hasEpisodes(m));
  const missing = entries
    .filter((m) => !hasEpisodes(m) && m.tmdbId && !runtimes.has(keyOf(m)))
    .map(keyOf);
  const { isFetching } = useQuery({
    queryKey: ["runtimes", missing.join(",")],
    queryFn: () => loadRuntimes(missing),
    enabled: missing.length > 0,
    staleTime: Infinity,
  });

  const minutes = entries.reduce(
    (sum, m) => sum + (hasEpisodes(m) ? m.episodeMinutes || 0 : runtimes.get(keyOf(m)) || 0),
    0,
  );
  return { minutes, loading: isFetching || missing.length > 0 };
}
