import { useApiCall } from "./social";

// Принять или отклонить приглашение в общий список
export function useAnswerInvite() {
  const call = useApiCall();
  return (listId, action) =>
    call(`/api/lists/${listId}/${action === "accept" ? "accept" : "decline"}`, { method: "POST" }, [
      ["listInvites"],
      ["lists"],
    ]);
}
