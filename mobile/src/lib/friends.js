import { Alert } from "react-native";
import { useApiCall } from "./social";

// Ответ на заявку в друзья (экран «Друзья» и уведомления)
export function useAnswerFriendRequest() {
  const call = useApiCall();
  return (userId, action) =>
    call(`/api/users/${userId}/friend-request`, { method: "PUT", body: { action } }, [
      ["friendRequests"],
      ["friends"],
      ["feed"],
    ]);
}

// Подтверждение и удаление из друзей
export function useConfirmRemoveFriend(onDone) {
  const call = useApiCall();
  return (friend) =>
    Alert.alert(
      "Удалить из друзей?",
      `Вы перестанете видеть отзывы друг друга, а записи ${friend.username} пропадут из вашей ленты. Позже можно снова отправить заявку.`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () =>
            call(`/api/friends/${friend.id}`, { method: "DELETE" }, [["friends"], ["feed"], ["profile"]])
              .then(() => onDone?.())
              .catch((e) => Alert.alert("Не получилось", e.message)),
        },
      ],
    );
}

