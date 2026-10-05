import { useState, useEffect } from 'react'



// ВСТАВЬ СЮДА СВОЙ API КЛЮЧ ОТ TMDB
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TMDB_API_KEY = '64608a2a9d2e16b7cd99fcde547034f3' 
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'





function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/movies`);
      const data = await response.json();
      setMovies(data);
    } catch (error) {
      console.error('Ошибка при загрузке фильмов:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=ru-RU`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
      setShowSearch(true);
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addMovie = async (movie) => {
    try {
      const response = await fetch(`${API_URL}/api/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.id,
          title: movie.title,
          posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
          status: 'WATCHLIST'
        })
      });

      if (response.ok) {
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
        fetchMovies();
      }
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const deleteMovie = async (movieId) => {
    if (!confirm('Удалить этот фильм?')) return;
    
    try {
      await fetch(`${API_URL}/api/movies/${movieId}`, { method: 'DELETE' });
      fetchMovies();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const toggleStatus = async (movie) => {
    const newStatus = movie.status === 'WATCHED' ? 'WATCHLIST' : 'WATCHED';
    
    try {
      await fetch(`${API_URL}/api/movies/${movie.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchMovies();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const filteredMovies = movies.filter(movie => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Watched') return movie.status === 'WATCHED';
    if (activeTab === 'Watchlist') return movie.status === 'WATCHLIST';
    return true;
  });

  const stats = {
    watched: movies.filter(m => m.status === 'WATCHED').length,
    watchlist: movies.filter(m => m.status === 'WATCHLIST').length,
    total: movies.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl"></div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              Movie Grade
            </h1>
          </div>

          <div className="flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center font-bold">
                A
              </div>
              <div>
                <div className="font-semibold">Alex K.</div>
                <div className="text-xs text-slate-400">Профиль · Настройки</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <aside className="col-span-3 space-y-6">
          {/* Profile Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold mb-4">Alex K.'s Journal</h2>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg">
                A
              </div>
              <div>
                <div className="font-semibold">Alex K.</div>
                <div className="text-sm text-slate-400">Профиль</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Stats</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{stats.watched}</div>
                  <div className="text-xs text-slate-400">Просмотры</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-pink-400">54</div>
                  <div className="text-xs text-slate-400">Друзья</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.watchlist}</div>
                  <div className="text-xs text-slate-400">Плейлисты</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Навигация</h3>
              <nav className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Мои просмотры
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Список фильмов
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Сообщество
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Поиск
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Настройки
                </button>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="col-span-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Мои просмотры</h2>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить фильм
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mb-6 border-b border-slate-700/50">
            {['All', 'Watched', 'Watchlist', 'Notes'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Results */}
          {showSearch && searchResults.length > 0 && (
            <div className="mb-6 bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold mb-4">Результаты поиска</h3>
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {searchResults.map(movie => (
                  <div key={movie.id} className="bg-slate-900/50 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                    <img
                      src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image'}
                      alt={movie.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3">
                      <h4 className="font-semibold mb-2">{movie.title}</h4>
                      <button
                        onClick={() => addMovie(movie)}
                        className="w-full bg-orange-500 hover:bg-orange-600 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Add to Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movies Grid */}
          {filteredMovies.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <p className="text-lg">Сейчас нет фильмов, добавь свой первый фильм!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredMovies.map(movie => (
                <div key={movie.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-orange-500/50 transition-all group">
                  <div className="relative">
                    <img
                      src={movie.posterUrl || 'https://via.placeholder.com/300x450?text=No+Image'}
                      alt={movie.title}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                        <button
                          onClick={() => toggleStatus(movie)}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {movie.status === 'WATCHED' ? '📌 Watchlist' : '✅ Watched'}
                        </button>
                        <button
                          onClick={() => deleteMovie(movie.id)}
                          className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{movie.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        movie.status === 'WATCHED' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {movie.status === 'WATCHED' ? 'Watched' : 'Watchlist'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-slate-400">
                      {new Date(movie.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="col-span-3 space-y-6">
          {/* Friends Activity */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold mb-4">Активность друзей</h3>
            <div className="space-y-4">
              {[
                { name: 'Elena B.', action: 'added "Barbie" to Watched', avatar: 'E' },
                { name: 'Tom G.', action: 'rated "Oppenheimer" to Watched', avatar: 'T' },
                { name: 'Maria S.', action: '"Oppenheimer"', avatar: 'M', rating: 5 },
                { name: 'Tom G.', action: '"Oppenheimer"', avatar: 'T', rating: 5 }
              ].map((friend, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {friend.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{friend.name}</div>
                    <div className="text-xs text-slate-400">{friend.action}</div>
                    {friend.rating && (
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(friend.rating)].map((_, i) => (
                          <svg key={i} className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discover Friends */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold mb-4">Поиск друзей</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Введите никнейм друга"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
