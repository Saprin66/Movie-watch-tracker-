import { useState } from "react";
import Icon from "./Icon";
import { Avatar } from "./ui";
import {
  MONTHS,
  formatHours,
  isThisMonth,
  summarize,
  useRuntimes,
  watchedDate,
} from "../utils/watchStats";

const FRIENDS_PREVIEW = 5;

// Заглушки: настоящих достижений пока нет
const ACHIEVEMENTS = [
  { icon: "clapperboard", name: "Первый фильм" },
  { icon: "popcorn", name: "Киноман" },
  { icon: "flame", name: "Марафонец" },
  { icon: "star", name: "Критик" },
  { icon: "tv", name: "Сериальщик" },
  { icon: "users", name: "Душа компании" },
];

function StatTile({ value, unit, label, loading }) {
  return (
    <div className="mg-glass-chip flex-col !items-start !gap-0 !rounded-[18px] !px-3.5 !py-3 min-w-0">
      <div className="font-display text-[22px] sm:text-[26px] font-bold text-white leading-none">
        {loading ? <span className="opacity-50">…</span> : value}
        {unit && <span className="ml-1 text-sm font-bold text-[#c4c8e4]">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11px] sm:text-xs font-bold text-[#aeb3d6] truncate max-w-full">
        {label}
      </div>
    </div>
  );
}

function StatsBlock({ title, summary, loading }) {
  const hours = formatHours(summary.minutes);
  return (
    <div>
      <h3 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4]">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={hours.value} unit={hours.unit} label="Время" loading={loading} />
        <StatTile value={summary.films} label="Фильмов" />
        <StatTile value={summary.series} label="Сериалов" />
      </div>
    </div>
  );
}

export default function ProfilePage({
  user,
  movies,
  friends,
  avatarSaving,
  avatarMessage,
  avatarError,
  onPickAvatar,
  onOpenSettings,
  onOpenStats,
  onOpenFriend,
  onManageFriends,
}) {
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [premiumNote, setPremiumNote] = useState(false);
  const { runtimes, loading } = useRuntimes(movies);

  const watched = movies.filter((m) => m.status === "WATCHED");
  const total = summarize(watched, runtimes);
  const month = summarize(
    watched.filter((m) => isThisMonth(watchedDate(m))),
    runtimes,
  );
  const visibleFriends = friendsExpanded ? friends : friends.slice(0, FRIENDS_PREVIEW);
  const initial = user?.username?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative isolate mx-auto max-w-xl">
      {/* Цветное свечение за стеклом, чтобы было что размывать */}
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-[420px] -z-10 overflow-hidden" aria-hidden="true">
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-full h-full object-cover blur-[60px] opacity-50 scale-125" />
        ) : (
          <>
            <div className="absolute left-[10%] top-6 w-56 h-56 rounded-full bg-[#ff7a45]/40 blur-[70px]" />
            <div className="absolute right-[8%] top-24 w-56 h-56 rounded-full bg-[#8b5cf6]/40 blur-[70px]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080a16]/40 to-[#080a16]" />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Настройки профиля"
          title="Настройки профиля"
          className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
        >
          <Icon n="settings" className="w-5 h-5" />
        </button>
      </div>

      {/* Аватар и ник */}
      <div className="flex flex-col items-center text-center">
        <div className="mg-page-poster relative">
          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full p-[3px] bg-gradient-to-br from-[#ff7a45] via-[#ffb08c]/60 to-[#8b5cf6] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            {user?.avatar ? (
              <img src={user.avatar} alt="Аватар профиля" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-[#12152a] flex items-center justify-center font-display text-[56px] font-bold text-white">
                {initial}
              </div>
            )}
          </div>
          {/* Кнопка смены фото стоит на границе круга */}
          <button
            type="button"
            disabled={avatarSaving}
            onClick={onPickAvatar}
            aria-label="Изменить фото профиля"
            title="Изменить фото"
            className="mg-glass-btn mg-glass-btn--orange absolute right-0.5 bottom-0.5 sm:right-1 sm:bottom-1 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-60"
          >
            <Icon n={avatarSaving ? "loader-circle" : "camera"} className={`w-5 h-5 ${avatarSaving ? "animate-spin" : ""}`} />
          </button>
        </div>

        <h1
          className="mg-page-rise mt-5 max-w-full font-display text-[28px] sm:text-[34px] font-bold text-white truncate"
          style={{ animationDelay: "80ms" }}
        >
          {user?.username || "Киноман"}
        </h1>
        {avatarMessage && <p role="status" className="mt-2 text-xs text-emerald-300">{avatarMessage}</p>}
        {avatarError && <p role="alert" className="mt-2 max-w-xs text-xs text-red-300">{avatarError}</p>}
      </div>

      <div className="mg-page-rise mt-7 space-y-4" style={{ animationDelay: "140ms" }}>
        {/* Достижения */}
        <section className="mg-glass-panel rounded-[24px] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-[17px] font-semibold text-white">Достижения</h2>
            <span className="mg-glass-chip !py-1 !px-2.5 !text-[11px]">Скоро</span>
          </div>
          <ul className="no-scrollbar -mx-5 px-5 flex gap-3 overflow-x-auto">
            {ACHIEVEMENTS.map((a) => (
              <li key={a.name} className="w-[76px] shrink-0 text-center">
                <div className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                  <Icon n={a.icon} className="w-6 h-6 opacity-35" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#12152a] border border-white/15 flex items-center justify-center">
                    <Icon n="lock" className="w-3 h-3 opacity-70" />
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-bold leading-tight text-[#9aa0c4]">{a.name}</div>
              </li>
            ))}
          </ul>
        </section>

        {/* Premium: пока без оплаты */}
        <div>
          <button
            type="button"
            onClick={() => setPremiumNote(true)}
            className="mg-premium-btn w-full h-14 rounded-full inline-flex items-center justify-center gap-2.5 text-[15px] font-extrabold text-[#2a1600]"
          >
            <Icon n="crown" className="w-5 h-5 [filter:brightness(0.15)]" />
            Upgrade to Premium
          </button>
          {premiumNote && (
            <p role="status" className="mt-2 text-center text-xs text-[#c4c8e4]">
              Premium скоро появится — следи за обновлениями
            </p>
          )}
        </div>

        {/* Статистика */}
        <section className="mg-glass-panel rounded-[24px] p-5 space-y-5">
          <StatsBlock title="За всё время" summary={total} loading={loading} />
          <StatsBlock title={`${MONTHS[new Date().getMonth()]} — этот месяц`} summary={month} loading={loading} />
          <button
            type="button"
            onClick={onOpenStats}
            className="mg-glass-btn mg-glass-btn--wide w-full h-12 rounded-full inline-flex items-center justify-center gap-2 text-sm font-extrabold text-white"
          >
            <Icon n="chart-column" className="w-4 h-4" />
            Подробная статистика
            <Icon n="chevron-right" className="w-4 h-4 opacity-70" />
          </button>
        </section>

        {/* Друзья */}
        <section className="mg-glass-panel rounded-[24px] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-[17px] font-semibold text-white">
              Друзья <span className="text-[#9aa0c4]">· {friends.length}</span>
            </h2>
            <button type="button" onClick={onManageFriends} className="text-sm font-bold text-[#ff935f] hover:text-[#ffb08c]">
              Управлять
            </button>
          </div>
          {friends.length === 0 ? (
            <p className="py-2 text-sm text-[#aeb3d6]">Пока друзей нет. Их можно найти во вкладке «Друзья».</p>
          ) : (
            <ul className="space-y-1">
              {visibleFriends.map((friend) => (
                <li key={friend.id} className="mg-page-rise">
                  <button
                    type="button"
                    onClick={() => onOpenFriend(friend.id)}
                    className="w-full flex items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-white/[0.07] transition-colors"
                  >
                    <Avatar name={friend.username} avatar={friend.avatar} />
                    <span className="min-w-0 flex-1 text-sm font-extrabold text-white truncate">{friend.username}</span>
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
    </div>
  );
}
