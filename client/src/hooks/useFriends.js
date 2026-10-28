import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

// Друзья и последний просмотренный фильм каждого (для боковой панели)
export function useFriends() {
  const { token, getFriends } = useAuth();
  const [friends, setFriends] = useState([]);
  const [lastWatched, setLastWatched] = useState({});

  const loadFriends = useCallback(async () => {
    try {
      const data = await getFriends();
      const friendsList = Array.isArray(data) ? data : [];
      setFriends(friendsList);

      // Последний фильм каждого друга загружаем параллельно
      const byFriend = {};
      await Promise.all(
        friendsList.map(async (friend) => {
          try {
            const res = await fetch(`${API_URL}/api/users/${friend.id}/last-watched`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const movie = await res.json();
              if (movie) byFriend[friend.id] = movie;
            }
          } catch (err) {
            console.error(`Ошибка загрузки фильма для ${friend.username}:`, err);
          }
        }),
      );
      setLastWatched(byFriend);
    } catch (error) {
      console.error("Ошибка загрузки друзей:", error);
      setFriends([]);
    }
    // getFriends пересоздаётся при каждом рендере контекста, а нужен только токен
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // Загрузка с сервера: состояние меняется уже после ответа
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) loadFriends();
  }, [token, loadFriends]);

  return { friends, lastWatched, loadFriends };
}
