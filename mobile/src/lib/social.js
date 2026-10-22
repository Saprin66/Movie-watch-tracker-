import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";

// Запросы к API про друзей, профили, ленту и общие списки.
// Каждый хук возвращает объект useQuery: { data, isLoading, error, refetch }.

function useApiQuery(key, path, options = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: key,
    queryFn: () => api(path, { token }),
    enabled: Boolean(token) && options.enabled !== false,
    ...options,
  });
}

// Заявки и приглашения проверяем раз в минуту, как сайт
const POLL = 60 * 1000;

export const useFriends = () => useApiQuery(["friends"], "/api/friends/list");
export const useFriendRequests = () =>
  useApiQuery(["friendRequests"], "/api/users/friends/requests", { refetchInterval: POLL });
export const useListInvites = () =>
  useApiQuery(["listInvites"], "/api/lists/invites", { refetchInterval: POLL });
export const useFeed = () => useApiQuery(["feed"], "/api/feed");
export const useProfile = (userId) =>
  useApiQuery(["profile", userId], `/api/users/${userId}`, { enabled: Boolean(userId) });
export const useLastWatched = (userId, enabled = true) =>
  useApiQuery(["lastWatched", userId], `/api/users/${userId}/last-watched`, { enabled });
export const useLists = () => useApiQuery(["lists"], "/api/lists");
export const useList = (listId) => useApiQuery(["list", listId], `/api/lists/${listId}`);

// Запрос к API с токеном и последующим обновлением перечисленных данных.
// Пример: const call = useApiCall(); await call("/api/lists", { method: "POST", body }, [["lists"]]);
export function useApiCall() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return async (path, options = {}, invalidate = []) => {
    const data = await api(path, { token, ...options });
    await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    return data;
  };
}

// Онлайн: заходил в последние 10 минут (как на сайте)
export const isOnline = (lastSeen) =>
  Boolean(lastSeen) && Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000;
