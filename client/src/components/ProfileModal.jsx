import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";
import { Avatar, Poster } from "./ui";
import { AchievementsSection, ProfileHero, StatsSection } from "./ProfileParts";
import FranchisesSection from "./FranchisesSection";
import { useProfileStats } from "../hooks/useProfileStats";
import { useScrollLock } from "../hooks/useScrollLock";
import { useBackClose } from "../hooks/useBackClose";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const FRIENDS_PREVIEW = 5;
const ONLINE_MS = 5 * 60 * 1000;

const dateLabel = (value) =>
  value ? new Date(value).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : "недавно";
const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "";

const isOnline = (value) => Boolean(value) && Date.now() - new Date(value).getTime() < ONLINE_MS;

const lastSeenLabel = (value) => {
  if (!value) return "не в сети";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 5) return "в сети";
  if (minutes < 60) return `был ${minutes} мин назад`;
  if (minutes < 1440) return `был ${Math.floor(minutes / 60)} ч назад`;
  return `был ${Math.floor(minutes / 1440)} дн назад`;
};

// Цифры для тех, кто не в друзьях: журнал целиком им не приходит
function CountTile({ value, label }) {
  return (
    <div className="mg-glass-chip flex-col !items-start !gap-0 !rounded-[18px] !px-3.5 !py-3 min-w-0">
      <div className="font-display text-[22px] sm:text-[26px] font-bold text-white leading-none">{value ?? 0}</div>
      <div className="mt-1.5 text-[11px] sm:text-xs font-bold text-[#aeb3d6] truncate max-w-full">{label}</div>
    </div>
  );
}

// Последние фильмы: статус, оценка и отзыв (отзыв — только друзьям)
function RecentSection({ movies, reviewsHidden, onOpenMovie }) {
  if (!movies?.length) return null;
  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <h2 className="mb-3 font-display text-[17px] font-semibold text-white">Недавно</h2>
      {reviewsHidden && <p className="mb-3 text-xs text-[#9aa0c4]">Отзывы видны только друзьям</p>}
      <ul className="space-y-1">
        {movies.map((m) => {
          const watched = m.status === "WATCHED";
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={!m.tmdbId}
                onClick={() => onOpenMovie({ id: m.tmdbId, media_type: m.mediaType === "tv" ? "tv" : "movie", title: m.title, posterUrl: m.posterUrl })}
                className="w-full flex gap-3 rounded-2xl p-2 text-left hover:bg-white/[0.06] transition-colors"
              >
                <div className="w-12 shrink-0 aspect-[2/3] overflow-hidden rounded-[10px] border border-white/15">
                  <Poster src={m.posterUrl} title={m.title} small />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-white">{m.title}</span>
                    {m.rating && (
                      <span className="mg-glass-chip mg-glass-chip--orange !py-0.5 !px-2 !text-xs shrink-0">★ {m.rating}</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-[#9aa0c4]">
                    <span className={watched ? "text-[#58dcaa]" : "text-[#86b8ff]"}>
                      {watched ? "Просмотрено" : "Буду смотреть"}
                    </span>
                    {" · "}
                    {shortDate(watched && m.watchedAt ? m.watchedAt : m.updatedAt)}
                  </div>
                  {m.comment && (
                    <p className="mt-1 text-[13px] leading-relaxed text-[#e2e4f3] line-clamp-2 break-words">{m.comment}</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Профиль другого пользователя на весь экран, в том же стиле, что и свой профиль.
// Друзьям сервер отдаёт облегчённый журнал — по нему считаем достижения, время и франшизы.
export default function ProfileModal({ userId, token, onClose, onUserClick, onFriendRemoved, onOpenMovie }) {
  useScrollLock();
  const { leaving, close } = useBackClose("profile", onClose);
  const { user, removeFriend, sendFriendRequest } = useAuth();
  const [state, setState] = useState({ loading: true, profile: null, error: "" });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const isOwnProfile = Boolean(user && user.id === userId);

  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;
    fetch(`${API_URL}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
        return data;
      })
      .then((profile) => !cancelled && setState({ loading: false, profile, error: "" }))
      .catch((error) => !cancelled && setState({ loading: false, profile: null, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [userId, token]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { loading, profile, error } = state;
  const journal = profile?.journal || null;
  const friendsCount = profile?.friendsCount ?? profile?.friends?.length ?? 0;
  const stats = useProfileStats(journal || [], friendsCount);
  const isFriend = Boolean(profile && !isOwnProfile && !profile.reviewsHidden);
  const online = isOnline(profile?.lastSeen);
  const friends = profile?.friends || [];
  const visibleFriends = friendsExpanded ? friends : friends.slice(0, FRIENDS_PREVIEW);

  const addFriend = async () => {
    const result = await sendFriendRequest(userId);
    setRequestStatus(result.success ? result.message || "Заявка отправлена" : result.error || "Не удалось отправить заявку");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={profile?.username || "Профиль"}
      className={`fixed inset-0 z-50 bg-[#080a16] overflow-hidden ${leaving ? "mg-page-leave" : "mg-page-enter"}`}
    >
      <div className="relative h-full overflow-y-auto scroll-contain">
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={close}
            aria-label="Назад"
            className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
          >
            <Icon n="arrow-left" className="w-5 h-5" />
          </button>
          {isFriend && (
            <button
              type="button"
              onClick={() => {
                setRemoveError("");
                setConfirmRemove(true);
              }}
              aria-label="Удалить из друзей"
              title="Удалить из друзей"
              className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
            >
              <Icon n="user-minus" className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        <div className="relative isolate mx-auto max-w-xl px-4 pb-[calc(3rem+env(safe-area-inset-bottom))]">
          {loading ? (
            <p className="py-16 text-center text-[#8b91b5] animate-pulse">Загрузка профиля…</p>
          ) : error || !profile ? (
            <p role="alert" className="mt-10 rounded-2xl border border-red-400/25 bg-red-500/15 px-4 py-3 text-sm text-red-200">
              Не удалось загрузить профиль{error ? `: ${error}` : ""}
            </p>
          ) : (
            <>
              <ProfileHero user={profile}>
                <div className="mg-page-rise mt-1.5 text-xs text-[#9aa0c4]" style={{ animationDelay: "100ms" }}>
                  На MovieGrade с {dateLabel(profile.createdAt)} ·{" "}
                  <span className={online ? "font-bold text-[#58dcaa]" : ""}>{lastSeenLabel(profile.lastSeen)}</span>
                </div>
                {profile.bio && (
                  <p className="mg-page-rise mt-3 max-w-md text-sm text-[#c4c8e4] whitespace-pre-wrap break-words" style={{ animationDelay: "120ms" }}>
                    {profile.bio}
                  </p>
                )}
                {!isOwnProfile && !isFriend && (
                  <div className="mt-4">
                    {requestStatus ? (
                      <p role="status" className="text-sm text-[#c4c8e4]">{requestStatus}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={addFriend}
                        className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--orange h-11 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold text-white"
                      >
                        <Icon n="user-plus" className="w-4 h-4" /> Добавить в друзья
                      </button>
                    )}
                  </div>
                )}
              </ProfileHero>

              <div className="mg-page-rise mt-7 space-y-4" style={{ animationDelay: "140ms" }}>
                {journal ? (
                  <>
                    <AchievementsSection achievements={stats.achievements} unlockedFirst />
                    <StatsSection total={stats.total} month={stats.month} loading={stats.loading} />
                    <FranchisesSection franchises={stats.franchises} loading={stats.loading} onOpenMovie={onOpenMovie} />
                  </>
                ) : (
                  <section className="mg-glass-panel rounded-[24px] p-5">
                    <div className="grid grid-cols-3 gap-2">
                      <CountTile value={profile.moviesCount} label="В журнале" />
                      <CountTile value={profile.watchedCount} label="Просмотрено" />
                      <CountTile value={friendsCount} label="Друзей" />
                    </div>
                    {!isOwnProfile && (
                      <p className="mt-4 flex items-center gap-2 text-sm text-[#aeb3d6]">
                        <Icon n="lock" className="w-4 h-4 opacity-70" />
                        Достижения и статистика видны только друзьям
                      </p>
                    )}
                  </section>
                )}

                <RecentSection movies={profile.recentMovies} reviewsHidden={profile.reviewsHidden} onOpenMovie={onOpenMovie} />

                <section className="mg-glass-panel rounded-[24px] p-5">
                  <h2 className="mb-3 font-display text-[17px] font-semibold text-white">
                    Друзья <span className="text-[#9aa0c4]">· {friends.length}</span>
                  </h2>
                  {friends.length === 0 ? (
                    <p className="py-2 text-sm text-[#aeb3d6]">Список друзей пока пуст.</p>
                  ) : (
                    <ul className="space-y-1">
                      {visibleFriends.map((friend) => (
                        <li key={friend.id}>
                          <button
                            type="button"
                            onClick={() => onUserClick?.(friend.id)}
                            className="w-full flex items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-white/[0.07] transition-colors"
                          >
                            <Avatar name={friend.username} avatar={friend.avatar} />
                            <span className="min-w-0 flex-1 text-sm font-extrabold text-white truncate">
                              {friend.id === user?.id ? `${friend.username} (вы)` : friend.username}
                            </span>
                            <Icon n="chevron-right" className="w-4 h-4 opacity-50" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {friends.length > FRIENDS_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setFriendsExpanded((v) => !v)}
                      aria-expanded={friendsExpanded}
                      className="mg-glass-btn mg-glass-btn--wide mt-3 w-full h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white"
                    >
                      {friendsExpanded ? "Свернуть" : `Показать всех (${friends.length})`}
                      <Icon n={friendsExpanded ? "chevron-up" : "chevron-down"} className="w-4 h-4 opacity-70" />
                    </button>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      {confirmRemove && profile && (
        <ConfirmDialog
          title="Удалить из друзей?"
          message={<>Вы точно хотите удалить <b className="text-white">{profile.username}</b> из друзей? Вы перестанете видеть отзывы друг друга, а его записи пропадут из вашей ленты.</>}
          confirmLabel="Удалить из друзей"
          icon="user-minus"
          busy={removing}
          error={removeError}
          onClose={() => setConfirmRemove(false)}
          onConfirm={async () => {
            setRemoving(true);
            setRemoveError("");
            const result = await removeFriend(profile.id);
            setRemoving(false);
            if (!result.success) return setRemoveError(result.error);
            setConfirmRemove(false);
            onFriendRemoved?.(profile.id);
            close();
          }}
        />
      )}
    </div>
  );
}
