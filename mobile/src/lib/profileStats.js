import { useCollections } from "./collections";
import { useWatchMinutes } from "./watchTime";
import { computeAchievements } from "../utils/achievements";
import { startedFranchises } from "../utils/franchises";

// Всё, что профиль (свой или друга) считает по журналу: время, достижения, франшизы
export function useProfileStats(movies = [], friendsCount = 0) {
  const { minutes, collections, loading } = useWatchMinutes(movies);
  const loaded = useCollections(collections);
  const franchises = startedFranchises(loaded, movies);
  const achievements = computeAchievements({
    movies,
    minutes,
    friendsCount,
    franchisesDone: franchises.filter((f) => f.done).length,
  });
  return { minutes, achievements, franchises, loading };
}
