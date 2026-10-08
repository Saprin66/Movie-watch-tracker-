import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Icon = ({ n, className = 'w-4 h-4' }) => (
  <img 
    src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`} 
    alt="" 
    className={`${className} invert shrink-0`} 
  />
);

const Avatar = ({ name, size = 'w-20 h-20', text = 'text-3xl' }) => (
  <div className={`${size} ${text} rounded-2xl bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center font-bold text-white shrink-0 shadow-xl`}>
    {name?.[0]?.toUpperCase() || 'U'}
  </div>
);

const StatCard = ({ value, label, color }) => (
  <div className="bg-[#1c2040] border border-white/5 rounded-xl p-4 text-center">
    <div className={`text-3xl font-bold mb-1 ${color}`}>{value}</div>
    <div className="text-xs text-[#8a90b8]">{label}</div>
  </div>
);

export default function ProfileModal({ userId, token, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !token) return;
    
    setLoading(true);
    // ВАЖНО: запрос идет точно на /api/users/:userId (без /profile на конце)
    fetch(`${API_URL}/api/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Сервер вернул ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then(data => {
        
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Ошибка загрузки профиля:', err);
        setLoading(false);
      });
  }, [userId, token]);

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Не в сети';
    const minutesAgo = Math.floor((new Date() - new Date(lastSeen)) / 1000 / 60);
    if (minutesAgo < 1) return 'Только что';
    if (minutesAgo < 60) return `${minutesAgo} мин назад`;
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours} ч назад`;
    return `${Math.floor(hours / 24)} дн назад`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#171a33] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка с градиентом */}
        <div className="relative h-32 bg-gradient-to-br from-[#f47c4f]/20 to-[#8a4fff]/20 rounded-t-2xl">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <Icon n="x" className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#8a90b8] animate-pulse">Загрузка профиля...</div>
        ) : profile ? (
          <div className="px-6 pb-6 -mt-12 relative">
            {/* Аватар и основная информация */}
            <div className="flex items-end gap-5 mb-6">
              <Avatar name={profile.username} />
              <div className="flex-1 pb-1">
                <h2 className="text-2xl font-bold text-white mb-1">{profile.username}</h2>
                <div className="flex items-center gap-2 text-xs text-[#8a90b8]">
                  <span>На сайте с {new Date(profile.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                  <span>•</span>
                  <span className={profile.lastSeen ? 'text-emerald-400' : ''}>
                    {profile.lastSeen ? `Был(а) ${formatLastSeen(profile.lastSeen)}` : 'Не в сети'}
                  </span>
                </div>
              </div>
            </div>

            {/* Статистика с умными фоллбэками (работает и с moviesCount, и с _count.movies) */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard 
                value={profile.moviesCount || profile._count?.movies || 0} 
                label="Всего в журнале" 
                color="text-[#f47c4f]" 
              />
              <StatCard 
                value={profile.watchedCount || 0} 
                label="Просмотрено" 
                color="text-emerald-400" 
              />
              <StatCard 
                value={profile.friendsCount || 0} 
                label="Друзей" 
                color="text-sky-400" 
              />
            </div>

            {/* Последние фильмы */}
            {profile.recentMovies && profile.recentMovies.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Icon n="clock" className="w-4 h-4 opacity-50" />
                  Последние активности
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {profile.recentMovies.map(movie => (
                    <div 
                      key={movie.id} 
                      className="group relative bg-[#1c2040] border border-white/5 rounded-lg overflow-hidden hover:border-[#f47c4f]/40 transition-colors"
                    >
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-[#262b55] flex items-center justify-center">
                          <Icon n="film" className="w-6 h-6 opacity-30" />
                        </div>
                      )}
                      
                      {/* Индикатор статуса */}
                      <div className="absolute top-1 right-1">
                        {movie.status === 'WATCHED' ? (
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                        )}
                      </div>

                      {/* Название при наведении */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <div className="text-[10px] text-white line-clamp-2 leading-tight">{movie.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!profile.recentMovies || profile.recentMovies.length === 0) && (
              <div className="text-center py-8 text-[#8a90b8] text-sm border-t border-white/5 pt-6">
                У пользователя пока нет фильмов в журнале
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-[#8a90b8]">Не удалось загрузить профиль</div>
        )}
      </div>
    </div>
  );
}
