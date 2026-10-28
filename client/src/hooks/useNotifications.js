import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listsRequest } from "../utils/listsApi";

// Уведомления: заявки в друзья и приглашения в общие списки.
// Обновляются при входе, раз в минуту и при возврате на сайт.
// onInviteAccepted(listId) — открыть список, в который только что вступили.
export function useNotifications({ onFriendsChanged, onInviteAccepted }) {
  const { token, user, getFriendRequests, handleFriendRequest } = useAuth();
  const [requestsCount, setRequestsCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState([]);
  const [listInvites, setListInvites] = useState([]);
  const [toastInvite, setToastInvite] = useState(null);
  const [listsRefreshKey, setListsRefreshKey] = useState(0);
  const refreshRef = useRef(() => {});

  useEffect(() => {
    if (!token || !user?.id) return undefined;
    let cancelled = false;
    const notifiedKey = `listInvitesNotified:${user.id}`;

    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const [requests, invites] = await Promise.all([
        getFriendRequests(),
        listsRequest(token, "/invites"),
      ]);
      if (cancelled) return;
      const requestList = Array.isArray(requests) ? requests : [];
      setFriendRequests(requestList);
      setRequestsCount(requestList.length);
      if (!invites.ok) return;
      const inviteList = Array.isArray(invites.data) ? invites.data : [];
      setListInvites(inviteList);

      // Всплывающее уведомление показываем один раз на каждое новое приглашение
      let notified = [];
      try {
        notified = JSON.parse(localStorage.getItem(notifiedKey) || "[]");
      } catch {
        notified = [];
      }
      const fresh = inviteList.find((i) => !notified.includes(i.listId));
      if (fresh) {
        setToastInvite(fresh);
        try {
          const ids = [...new Set([...notified, ...inviteList.map((i) => i.listId)])].slice(-100);
          localStorage.setItem(notifiedKey, JSON.stringify(ids));
        } catch {
          /* без хранилища уведомление может показаться повторно */
        }
      }
    };

    refreshRef.current = refresh;
    refresh();
    const timer = setInterval(refresh, 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
    // getFriendRequests пересоздаётся при каждом рендере контекста
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const refresh = () => refreshRef.current();

  const acceptInvite = async (invite) => {
    const result = await listsRequest(token, `/${invite.listId}/accept`, { method: "POST" });
    setToastInvite((t) => (t?.listId === invite.listId ? null : t));
    setListInvites((prev) => prev.filter((i) => i.listId !== invite.listId));
    if (result.ok) {
      setListsRefreshKey((k) => k + 1);
      onInviteAccepted?.(invite.listId);
    }
    refresh();
  };

  const declineInvite = async (invite) => {
    await listsRequest(token, `/${invite.listId}/decline`, { method: "POST" });
    setToastInvite((t) => (t?.listId === invite.listId ? null : t));
    setListInvites((prev) => prev.filter((i) => i.listId !== invite.listId));
    refresh();
  };

  const answerFriendRequest = async (request, action) => {
    await handleFriendRequest(request.id, action);
    setFriendRequests((prev) => prev.filter((r) => r.id !== request.id));
    setRequestsCount((n) => Math.max(0, n - 1));
    if (action === "accept") onFriendsChanged?.();
    refresh();
  };

  return {
    requestsCount,
    setRequestsCount,
    friendRequests,
    listInvites,
    toastInvite,
    closeToast: () => setToastInvite(null),
    listsRefreshKey,
    refresh,
    acceptInvite,
    declineInvite,
    answerFriendRequest,
  };
}
