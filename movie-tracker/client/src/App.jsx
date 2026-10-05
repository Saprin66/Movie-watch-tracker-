import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import FriendsPanel from './components/FriendsPanel';
import ProfileModal from './components/ProfileModal';




// ВСТАВЬ СЮДА СВОЙ API КЛЮЧ ОТ TMDB
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TMDB_API_KEY = '64608a2a9d2e16b7cd99fcde547034f3' 
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'



// ============ ГЛАВНЫЙ КОМПОНЕНТ С ВКЛАДКАМИ ============
function MovieTracker() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('movies');
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [movieFilter, setMovieFilter] = useState('all');

  // Загрузка фильмов при переключении на вкладку фильмов или поиска
  useEffect(() => {
    if (token && (activeTab === 'movies' || activeTab === 'search')) {
      fetchMovies();
    }
  }, [token, activeTab]);

  // Загружаем популярные фильмы при первом открытии поиска
  useEffect(() => {
    if (token && activeTab === 'search' && !searchQuery.trim()) {
      loadPopularMovies();
    }
  }, [token, activeTab]);

  const fetchMovies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMovies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Ошибка загрузки фильмов:', error);
    }
  };

  const loadPopularMovies = async () => {
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=8265bd1679663a7ea12ac168da84d2e8&language=ru-RU&page=1`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Ошибка загрузки популярных фильмов:', error);
    }
  };

  const addMovie = async (movie) => {
    try {
      await fetch(`${API_URL}/api/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(movie)
      });
      await fetchMovies();
    } catch (error) {
      console.error('Ошибка добавления:', error);
    }
  };

  const deleteMovie = async (id) => {
    try {
      await fetch(`${API_URL}/api/movies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchMovies();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const deleteMovieByTmdbId = async (tmdbId) => {
    const movieToDelete = movies.find(m => m.tmdbId === tmdbId);
    if (movieToDelete) {
      await deleteMovie(movieToDelete.id);
    }
  };

  const updateMovieStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/movies/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      await fetchMovies();
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  };

  const searchMovies = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      loadPopularMovies();
      return;
    }
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=8265bd1679663a7ea12ac168da84d2e8&query=${encodeURIComponent(query)}&language=ru-RU`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    }
  };

  const filteredMovies = movies.filter(movie => {
    if (movieFilter === 'all') return true;
    if (movieFilter === 'watchlist') return movie.status === 'WATCHLIST';
    if (movieFilter === 'watched') return movie.status === 'WATCHED';
    return true;
  });

  const watchlistCount = movies.filter(m => m.status === 'WATCHLIST').length;
  const watchedCount = movies.filter(m => m.status === 'WATCHED').length;

  const addedMovieIds = new Set(movies.map(m => m.tmdbId));

  const tabs = [
    { id: 'movies', label: 'Фильмы', icon: '🎬' },
    { id: 'search', label: 'Поиск', icon: '🔍' },
    { id: 'friends', label: 'Друзья', icon: '👥' },
    { id: 'profile', label: 'Профиль', icon: '👤' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      {/* ШАПКА (десктоп) */}
      <header className="hidden md:block sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎬</div>
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              Movie Grade
            </h1>
          </div>

          <nav className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="w-32"></div>
        </div>
      </header>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
        {/* ============ ВКЛАДКА: ФИЛЬМЫ ============ */}
        {activeTab === 'movies' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Мои фильмы</h2>
              <div className="text-sm text-slate-400">{movies.length} фильмов</div>
            </div>

            <div className="flex gap-2 bg-slate-800/50 rounded-xl p-1.5">
              <button
                onClick={() => setMovieFilter('all')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  movieFilter === 'all'
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Все ({movies.length})
              </button>
              <button
                onClick={() => setMovieFilter('watchlist')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  movieFilter === 'watchlist'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Буду смотреть ({watchlistCount})
              </button>
              <button
                onClick={() => setMovieFilter('watched')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  movieFilter === 'watched'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Просмотрено ({watchedCount})
              </button>
            </div>

            {filteredMovies.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-slate-400">
                  {movieFilter === 'all' 
                    ? 'Список пуст. Найди свой первый фильм!'
                    : movieFilter === 'watchlist'
                    ? 'Нет фильмов в списке "Буду смотреть"'
                    : 'Нет просмотренных фильмов'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredMovies.map(movie => (
                  <div key={movie.id} className="group relative bg-slate-800/50 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-slate-700 flex items-center justify-center text-4xl">🎬</div>
                    )}
                    
                    <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                      movie.status === 'WATCHED' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <div className="text-xs font-semibold text-white line-clamp-2 mb-1">{movie.title}</div>
                      <div className="flex gap-1">
                        {movie.status === 'WATCHLIST' ? (
                          <button
                            onClick={() => updateMovieStatus(movie.id, 'WATCHED')}
                            className="text-xs bg-green-500/80 hover:bg-green-500 px-2 py-1 rounded text-white"
                          >
                            ✓ Просмотрен
                          </button>
                        ) : (
                          <button
                            onClick={() => updateMovieStatus(movie.id, 'WATCHLIST')}
                            className="text-xs bg-blue-500/80 hover:bg-blue-500 px-2 py-1 rounded text-white"
                          >
                            📋 В список
                          </button>
                        )}
                        <button
                          onClick={() => deleteMovie(movie.id)}
                          className="text-xs bg-red-500/80 hover:bg-red-500 px-2 py-1 rounded text-white"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ ВКЛАДКА: ПОИСК ============ */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Поиск фильмов</h2>
            
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchMovies(e.target.value);
                }}
                placeholder="Введите название фильма..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 pl-11 text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
              <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {searchResults.length > 0 ? (
              <>
                {!searchQuery.trim() && (
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">🔥 Популярные фильмы</h3>
                    <div className="text-sm text-slate-400">Топ-20</div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {searchResults.map(movie => {
                    const isAdded = addedMovieIds.has(movie.id);
                    
                    return (
                      <div key={movie.id} className="group relative bg-slate-800/50 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                        {movie.poster_path ? (
                          <img src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[2/3] bg-slate-700 flex items-center justify-center text-4xl">🎬</div>
                        )}
                        
                        {isAdded && (
                          <div className="absolute top-2 right-2 z-20 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 shadow-lg">
                            ✓ В списке
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                deleteMovieByTmdbId(movie.id);
                              }}
                              className="ml-1 bg-red-500 hover:bg-red-600 rounded-full w-5 h-5 flex items-center justify-center transition-colors text-white"
                              title="Удалить из списка"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-2">
                          <div className="text-xs font-semibold text-white line-clamp-2 mb-2">{movie.title}</div>
                          {isAdded ? (
                            <div className="text-xs text-green-400 font-medium">✓ Уже в твоём списке</div>
                          ) : (
                            <button
                              onClick={() => addMovie({
                                tmdbId: movie.id,
                                title: movie.title,
                                posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : null,
                                status: 'WATCHLIST'
                              })}
                              className="text-xs bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded text-white"
                            >
                              + В список
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : searchQuery ? (
              <div className="text-center py-12 text-slate-400">Ничего не найдено</div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <div className="text-6xl mb-4">🔍</div>
                <p>Загрузка популярных фильмов...</p>
              </div>
            )}
          </div>
        )}

        {/* ============ ВКЛАДКА: ДРУЗЬЯ ============ */}
        {activeTab === 'friends' && (
          <div className="max-w-2xl mx-auto">
            <FriendsPanel onUserClick={setSelectedUserId} />
          </div>
        )}

        {/* ============ ВКЛАДКА: ПРОФИЛЬ ============ */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
                  <p className="text-slate-400 text-sm">{user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{movies.length}</div>
                  <div className="text-xs text-slate-400">Фильмов</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">0</div>
                  <div className="text-xs text-slate-400">Друзей</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserId(user?.id)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium mb-3 transition-colors"
              >
                Редактировать профиль
              </button>

              <button
                onClick={logout}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-3 rounded-lg font-medium transition-colors"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>
        )}
      </main>

      {/* МОБИЛЬНЫЙ НИЖНИЙ БАР */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40">
        <div className="flex justify-around items-center py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'text-orange-400'
                  : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* МОДАЛЬНОЕ ОКНО ПРОФИЛЯ */}
      {selectedUserId && (
        <ProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}

function App() {
  const { token, user } = useAuth();

  if (token && user && !user.isVerified) {
    return <AuthScreen />;
  }

  return token ? <MovieTracker /> : <AuthScreen />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}




