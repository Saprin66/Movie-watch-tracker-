import { useState } from "react";
import Icon from "./Icon";
import { Avatar } from "./ui";
import { AchievementsSection, ProfileHero, StatsSection } from "./ProfileParts";
import FranchisesSection from "./FranchisesSection";
import { useProfileStats } from "../hooks/useProfileStats";

const FRIENDS_PREVIEW = 5;

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
  onOpenMovie,
}) {
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [premiumNote, setPremiumNote] = useState(false);
  const { total, month, achievements, franchises, loading } = useProfileStats(movies, friends.length);
  const visibleFriends = friendsExpanded ? friends : friends.slice(0, FRIENDS_PREVIEW);

  return (
    <div className="relative isolate mx-auto max-w-xl">
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

      <ProfileHero
        user={user}
        avatarAction={
          // Кнопка смены фото стоит на границе круга
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
        }
      >
        {avatarMessage && <p role="status" className="mt-2 text-xs text-emerald-300">{avatarMessage}</p>}
        {avatarError && <p role="alert" className="mt-2 max-w-xs text-xs text-red-300">{avatarError}</p>}
      </ProfileHero>

      <div className="mg-page-rise mt-7 space-y-4" style={{ animationDelay: "140ms" }}>
        <AchievementsSection achievements={achievements} />

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
        <StatsSection total={total} month={month} loading={loading}>
          <button
            type="button"
            onClick={onOpenStats}
            className="mg-glass-btn mg-glass-btn--wide w-full h-12 rounded-full inline-flex items-center justify-center gap-2 text-sm font-extrabold text-white"
          >
            <Icon n="chart-column" className="w-4 h-4" />
            Подробная статистика
            <Icon n="chevron-right" className="w-4 h-4 opacity-70" />
          </button>
        </StatsSection>

        <FranchisesSection franchises={franchises} loading={loading} onOpenMovie={onOpenMovie} />

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
