import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Icon = ({ n, className = 'w-4 h-4' }) => (
  <img src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`} alt="" className={`${className} invert shrink-0`} />
);

export default function ProfileModal({ userId, token, onClose }) {
  const [profile, setProfile] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');

      // Добавляем токен в заголовки, если он есть
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      try {
        // 1. Загружаем профиль пользователя
        const userRes = await fetch(`${API_URL}/api/users/${userId}`, { headers });
        if (!userRes.ok) throw new Error('Не удалось загрузить профиль');
        const userData = await userRes.json();
        setProfile(userData);

        // 2. Загружаем его фильмы
        const moviesRes = await fetch(`${API_URL}/api/users/${userId}/movies`, { headers });
        if (moviesRes.ok) {
          const moviesData = await moviesRes.json();
          setMovies(Array.isArray(moviesData) ? moviesData : []);
        } else {
          setMovies([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        setError('Не удалось загрузить данные пользователя');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, token]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const watched = movies.filter(m => m.status === 'WATCHED').length;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#131631] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
        <div className="sticky top-0 bg-[#131631]/95 backdrop-blur border-b border-white/5 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-white">Профиль пользователя</h3>
          <button onClick={onClose} title="Закрыть" className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <Icon n="x" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-[#8a90b8]">
              <img src="https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/loader-circle.svg" alt="" className="w-8 h-8 invert opacity-60 animate-spin" />
              Загрузка...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-red-300">
              <Icon n="circle-alert" className="w-8 h-8" />
              {error}
            </div>
          ) : profile ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center text-3xl font-bold text-white shrink-0">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-semibold text-white truncate">{profile.username}</h2>
                  {profile.bio && <p className="text-[#8a90b8] text-sm mt-1 line-clamp-2">{profile.bio}</p>}
                  <div className="grid grid-cols-2 gap-3 mt-3 max-w-xs">
                    <div className="bg-[#171a33] rounded-lg px-3 py-2">
                      <div className="text-lg font-semibold text-white">{movies.length}</div>
                      <div className="text-[11px] text-[#8a90b8]">Фильмов</div>
                    </div>
                    <div className="bg-[#171a33] rounded-lg px-3 py-2">
                      <div className="text-lg font-semibold text-[#f47c4f]">{watched}</div>
                      <div className="text-[11px] text-[#8a90b8]">Просмотрено</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-white/5">
                  Коллекция ({movies.length})
                </h4>

                {movies.length === 0 ? (
                  <div className="text-center py-8 bg-[#171a33] rounded-xl border border-white/5">
                    <p className="text-[#8a90b8] text-sm">У пользователя пока нет фильмов</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {movies.map((movie) => (
                      <div key={movie.id} className="group relative bg-[#1c2040] rounded-xl overflow-hidden border border-white/5 hover:border-[#f47c4f]/50 transition-colors">
                        {movie.posterUrl ? (
                          <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-[#262b55] flex items-center justify-center">
                            <Icon n="film" className="w-6 h-6 opacity-30" />
                          </div>
                        )}

                        <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#131631] ${
                          movie.status === 'WATCHED' ? 'bg-emerald-400' : 'bg-sky-400'
                        }`}></div>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                          <div className="text-[10px] text-white font-medium line-clamp-3 leading-tight">
                            {movie.title}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
