import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-white">Профиль пользователя</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2 animate-pulse">⏳</div>
              Загрузка...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <div className="text-4xl mb-2">⚠️</div>
              {error}
            </div>
          ) : profile ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white truncate">{profile.username}</h2>
                  {profile.bio && (
                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{profile.bio}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>🎬 Фильмов: <span className="text-slate-300 font-medium">{movies.length}</span></span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                  Коллекция ({movies.length})
                </h4>
                
                {movies.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-slate-800">
                    <p className="text-slate-500 text-sm">У пользователя пока нет фильмов</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {movies.map((movie) => (
                      <div key={movie.id} className="group relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-orange-500 transition-all">
                        {movie.posterUrl ? (
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title} 
                            className="w-full aspect-[2/3] object-cover" 
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-slate-700 flex items-center justify-center text-2xl opacity-50">
                            🎬
                          </div>
                        )}
                        
                        <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                          movie.status === 'WATCHED' ? 'bg-green-500' : 'bg-blue-500'
                        }`}></div>

                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
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