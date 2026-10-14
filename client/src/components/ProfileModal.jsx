import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import RecentMovies from "./RecentMovies";
import { useScrollLock } from "../hooks/useScrollLock";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const Icon = ({ n, className = "w-4 h-4" }) => (
  <img src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`} alt="" className={`${className} invert shrink-0`} />
);

const Avatar = ({ profile, size = "w-24 h-24" }) => (
  profile?.avatar ? (
    <img src={profile.avatar} alt="" className={`${size} rounded-2xl object-cover shrink-0 border-2 border-[#252947] shadow-xl`} />
  ) : (
    <div className={`${size} rounded-2xl bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center text-4xl font-bold text-white shrink-0 shadow-xl border-2 border-[#252947]`}>
      {profile?.username ? String(profile.username)[0].toUpperCase() : "U"}
    </div>
  )
);

const StatCard = ({ value, label, tone }) => (
  <div className="bg-[#1c2040] border border-white/5 rounded-xl p-3 sm:p-4 text-center min-w-0">
    <div className={`text-2xl sm:text-3xl font-bold mb-1 ${tone}`}>{value ?? 0}</div>
    <div className="text-[11px] sm:text-xs text-[#8a90b8]">{label}</div>
  </div>
);

const dateLabel = (value) => value ? new Date(value).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : "Недавно";
const lastSeenLabel = (value) => {
  if (!value) return "Не в сети";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "В сети недавно";
  if (minutes < 60) return `${minutes} мин назад`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;
  return `${Math.floor(minutes / 1440)} дн назад`;
};

export default function ProfileModal({ userId, token, onClose, onUserClick }) {
  useScrollLock();
  const { updateProfile, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const isOwnProfile = Boolean(user && user.id === userId);

  useEffect(() => {
    if (!userId || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFriendsOpen(false);
    fetch(`${API_URL}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}: ${await res.text()}`);
        return res.json();
      })
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch((err) => { if (!cancelled) { console.error("Ошибка загрузки профиля:", err); setError(err.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, token]);

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (username.length < 3) return alert("Ник должен содержать минимум 3 символа");
    setIsUpdating(true);
    const result = await updateProfile(username);
    setIsUpdating(false);
    if (result.success) {
      setProfile((prev) => prev ? { ...prev, username } : prev);
      setNewUsername("");
      alert("Ник успешно изменён!");
    } else alert(result.error || "Ошибка при изменении ника");
  };

  if (!userId) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#171a33] border border-white/10 rounded-t-2xl sm:rounded-2xl max-w-3xl w-full max-h-[94dvh] sm:max-h-[90vh] overflow-y-auto scroll-contain pb-[env(safe-area-inset-bottom)]" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-32 sm:h-40 bg-gradient-to-r from-[#f47c4f]/25 via-[#8a4fff]/20 to-[#171a33] rounded-t-2xl">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #f47c4f 0, transparent 38%), radial-gradient(circle at 80% 10%, #8a4fff 0, transparent 40%)" }} />
          <button onClick={onClose} aria-label="Закрыть профиль" className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/70 rounded-full transition-colors"><Icon n="x" className="w-5 h-5" /></button>
        </div>

        {loading ? <div className="p-10 text-center text-[#8a90b8] animate-pulse">Загрузка профиля...</div> : error ? (
          <div className="p-8 text-center text-red-400"><p>Не удалось загрузить профиль.</p><p className="text-xs mt-2 opacity-70 break-words">{error}</p></div>
        ) : profile ? (
          <div className="px-4 sm:px-7 pb-7 -mt-12 relative space-y-5">
            <section className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
              <Avatar profile={profile} />
              <div className="flex-1 min-w-0 pb-1">
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#f47c4f] font-semibold mb-1">Кинопрофиль</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white break-words">{profile.username || "Пользователь"}</h2>
                {profile.bio && <p className="text-sm text-[#c9cce6] mt-1 whitespace-pre-wrap">{profile.bio}</p>}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#8a90b8] mt-2">
                  <span>На сайте с {dateLabel(profile.createdAt)}</span><span>·</span>
                  <span className={profile.lastSeen && Date.now() - new Date(profile.lastSeen).getTime() < 5 * 60 * 1000 ? "text-emerald-400" : ""}>{lastSeenLabel(profile.lastSeen)}</span>
                </div>
              </div>
            </section>

            {isOwnProfile && <section className="bg-[#1c2040] border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Icon n="edit" /> Изменить никнейм</h3>
              <form onSubmit={handleUpdateUsername} className="flex flex-col sm:flex-row gap-2">
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Новый ник (3–20 символов)" maxLength={20} className="flex-1 min-w-0 bg-[#171a33] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60" />
                <button type="submit" disabled={isUpdating || newUsername.trim().length < 3} className="bg-[#f47c4f] hover:bg-[#f47c4f]/90 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold">{isUpdating ? "Сохранение..." : "Сохранить"}</button>
              </form>
            </section>}

            <section className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard value={profile.moviesCount ?? profile._count?.movies ?? 0} label="В журнале" tone="text-[#f47c4f]" />
              <StatCard value={profile.watchedCount ?? 0} label="Просмотрено" tone="text-emerald-400" />
              <StatCard value={profile.friendsCount ?? profile.friends?.length ?? 0} label="Друзей" tone="text-sky-400" />
            </section>

            <section className="bg-[#1c2040] border border-white/5 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div><h3 className="text-lg font-bold text-white">Витрина фильмов</h3><p className="text-xs text-[#8a90b8] mt-1">Любимые фильмы пользователя</p></div>
                <Icon n="clapperboard" className="w-5 h-5 opacity-60" />
              </div>
              {profile.showcaseMovies?.length ? <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {profile.showcaseMovies.map((movie) => <div key={movie.id} className="min-w-0">
                  {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title || "Постер фильма"} loading="lazy" className="w-full aspect-[2/3] object-cover rounded-lg border border-white/10 shadow-lg" /> : <div className="w-full aspect-[2/3] rounded-lg bg-[#262b55] flex items-center justify-center"><Icon n="film" className="w-8 h-8 opacity-30" /></div>}
                  <p className="text-xs sm:text-sm text-white font-medium mt-2 line-clamp-2">{movie.title || "Без названия"}</p>
                  {movie.rating != null && <p className="text-xs text-amber-300 mt-1">★ {movie.rating}</p>}
                </div>)}
              </div> : <div className="rounded-lg border border-dashed border-white/10 py-7 text-center"><Icon n="clapperboard" className="w-7 h-7 mx-auto mb-2 opacity-30" /><p className="text-sm text-[#8a90b8]">Пользователь пока не оформил витрину</p></div>}
            </section>

            <section className="bg-[#1c2040] border border-white/5 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center"><Icon n="trophy" className="w-5 h-5" /></div><div><h3 className="text-lg font-bold text-white">Достижения</h3><p className="text-xs text-[#8a90b8]">Система достижений в разработке</p></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {["Первый фильм", "Киномарафон", "Кинокритик"].map((label) => <div key={label} className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/5 p-3 opacity-70"><div className="w-9 h-9 rounded-lg bg-[#262b55] flex items-center justify-center"><Icon n="lock-keyhole" className="w-4 h-4" /></div><div><p className="text-xs font-semibold text-white">{label}</p><p className="text-[10px] text-[#8a90b8]">В разработке</p></div></div>)}
              </div>
            </section>

            <section className="bg-[#1c2040] border border-white/5 rounded-xl p-4 sm:p-5">
              <button onClick={() => setFriendsOpen((open) => !open)} className="w-full flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center"><Icon n="users" className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0"><h3 className="text-lg font-bold text-white">Друзья</h3><p className="text-xs text-[#8a90b8]">{profile.friends?.length ?? profile.friendsCount ?? 0} в списке · нажмите, чтобы {friendsOpen ? "скрыть" : "посмотреть"}</p></div>
                <Icon n={friendsOpen ? "chevron-up" : "chevron-down"} className="w-5 h-5 opacity-60" />
              </button>
              {friendsOpen && <div className="mt-4 pt-4 border-t border-white/5">
                {!profile.friends?.length ? <p className="text-sm text-[#8a90b8] py-2">Список друзей пока пуст.</p> : <div className="grid sm:grid-cols-2 gap-2">
                  {profile.friends.map((friend) => <button key={friend.id} onClick={() => { if (onUserClick) onUserClick(friend.id); }} className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.03] hover:bg-white/[0.07] text-left transition-colors">
                    {friend.avatar ? <img src={friend.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center text-sm font-bold text-white">{friend.username?.[0]?.toUpperCase() || "U"}</div>}
                    <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white truncate">{friend.username}</span><span className="block text-xs text-[#8a90b8]">Открыть профиль</span></span><Icon n="arrow-up-right" className="w-4 h-4 opacity-50" />
                  </button>)}
                </div>}
              </div>}
            </section>

            {profile.recentMovies?.length ? <section className="bg-[#1c2040] border border-white/5 rounded-xl p-4 sm:p-5"><RecentMovies movies={profile.recentMovies} reviewsHidden={Boolean(profile.reviewsHidden)} /></section> : <div className="text-center py-5 text-[#8a90b8] text-sm">У пользователя пока нет фильмов в журнале</div>}
          </div>
        ) : <div className="p-8 text-center text-[#8a90b8]">Не удалось загрузить профиль</div>}
      </div>
    </div>
  );
}
