import { useQueries, useQuery } from "@tanstack/react-query";
import { tmdb } from "./tmdb";

// Коллекции меняются редко: держим их в памяти, пока приложение открыто
const ONE_DAY = 24 * 3600 * 1000;

const collectionQuery = (id) => ({
  queryKey: ["tmdb", "collection", String(id)],
  queryFn: () => tmdb(`/collection/${id}`),
  staleTime: ONE_DAY,
  gcTime: ONE_DAY,
});

// Коллекция по id (или ничего, если id нет)
export const useCollection = (id) => useQuery({ ...collectionQuery(id), enabled: Boolean(id) });

// Несколько коллекций для профиля: массив загруженных
export function useCollections(ids) {
  const unique = [...new Set(ids.map(String))];
  return useQueries({
    queries: unique.map(collectionQuery),
    combine: (results) => results.map((r) => r.data).filter(Boolean),
  });
}
