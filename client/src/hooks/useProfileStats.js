import { computeAchievements } from "../utils/achievements";
import { startedFranchises, useCollections } from "../utils/franchises";
import { isThisMonth, summarize, timeEntries, useRuntimes, watchedDate } from "../utils/watchStats";

// Всё, что профиль считает по журналу: время, достижения, франшизы
export function useProfileStats(movies, friendsCount) {
  const { runtimes, collections, loading } = useRuntimes(movies);
  const loaded = useCollections(Object.values(collections).map(String));
  const franchises = startedFranchises(loaded, movies);
  const watched = movies.filter((m) => m.status === "WATCHED");
  const total = summarize(timeEntries(movies), runtimes);
  // Пока длительность догружается, часы считаем без неё — значок откроется чуть позже
  const achievements = computeAchievements({
    movies,
    minutes: total.minutes,
    friendsCount,
    franchisesDone: franchises.filter((f) => f.done).length,
  });
  const month = summarize(
    watched.filter((m) => isThisMonth(watchedDate(m))),
    runtimes,
  );
  return { total, month, achievements, franchises, loading };
}
