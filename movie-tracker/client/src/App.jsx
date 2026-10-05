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
  const [activeTab, setActiveTab] = useState('all');
  const [showSearch, setShowSearch] = useState(false);

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
    if (!confirm('Удалить этот фильм из списка?')) return;
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
    if (activeTab === 'all') return true;
    if (activeTab === 'watched') return movie.status === 'WATCHED';
    if (activeTab === 'watchlist') return movie.status === 'WATCHLIST';
    return true;
  });

  const stats = {
    watched: movies.filter(m => m.status === 'WATCHED').length,
    watchlist: movies.filter(m => m.status === 'WATCHLIST').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white pb-20 lg:pb-0">
      {/* Шапка */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3 md:px-6 md:py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-0 md:justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl md:text-3xl">🎬</div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                Movie Grade
              </h1>
            </div>
            {/* Кнопка добавления для мобильной шапки */}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden bg-orange-500 p-2 rounded-full"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="w-full md:flex-1 md:max-w-xl md:mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Поиск фильмов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 pl-10 text-sm md:text-base focus:outline-none focus:border-orange-500 transition-colors"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </form>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center font-bold">
                A
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">Алексей</div>
                <div className="text-xs text-slate-400">Профиль</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Левый сайдбар (скрыт на мобильных, виден на больших экранах) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-bold mb-4">Дневник киномана</h2>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-lg">А</div>
              <div>
                <div className="font-semibold">Алексей</div>
                <div className="text-sm text-slate-400">Киноман</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats.watched}</div>
                <div className="text-xs text-slate-400">Просмотрено</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.watchlist}</div>
                <div className="text-xs text-slate-400">В планах</div>
              </div>
            </div>
            <nav className="space-y-2">
              {[
                { name: 'Главная', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                { name: 'Мой список', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { name: 'Буду смотреть', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
                { name: 'Открытия', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' }
              ].map((item) => (
                <button key={item.name} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700/50 rounded-lg transition-colors text-sm text-slate-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Основной контент */}
        <main className="col-span-1 lg:col-span-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Мои фильмы</h2>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="hidden md:flex bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-medium items-center gap-2 transition-colors text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить
            </button>
          </div>

          {/* Табы (горизонтальный скролл на мобильных) */}
          <div className="flex gap-4 md:gap-6 mb-6 border-b border-slate-700/50 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'Все' },
              { id: 'watched', label: 'Просмотрено' },
              { id: 'watchlist', label: 'В планах' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowSearch(false); }}
                className={`whitespace-nowrap pb-3 font-medium transition-colors text-sm md:text-base ${
                  activeTab === tab.id
                    ? 'text-orange-400 border-b-2 border-orange-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Результаты поиска */}
          {showSearch && searchResults.length > 0 && (
            <div className="mb-6 bg-slate-800/50 rounded-xl p-4 md:p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold mb-4">Результаты поиска</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {searchResults.map(movie => (
                  <div key={movie.id} className="bg-slate-900/50 rounded-lg overflow-hidden hover:scale-105 transition-transform">
                    <div className="aspect-[2/3] w-full bg-slate-800">
                      <img
                        src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=Нет+постера'}
                        alt={movie.title}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-xs md:text-sm mb-2 line-clamp-2">{movie.title}</h4>
                      <button
                        onClick={() => addMovie(movie)}
                        className="w-full bg-orange-500 hover:bg-orange-600 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
                      >
                        + В список
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Сетка фильмов */}
          {filteredMovies.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <p className="text-lg">Список пуст. Добавь свой первый фильм!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {filteredMovies.map(movie => (
                <div key={movie.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-orange-500/50 transition-all group">
                  <div className="relative bg-slate-900">
                    <div className="aspect-[2/3] w-full overflow-hidden">
                      <img
                        src={movie.posterUrl || 'https://via.placeholder.com/300x450?text=Нет+постера'}
                        alt={movie.title}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 md:p-4">
                      <div className="flex gap-1.5 md:gap-2">
                        <button
                          onClick={() => toggleStatus(movie)}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium transition-colors"
                        >
                          {movie.status === 'WATCHED' ? '📌 В планы' : '✅ Просмотрено'}
                        </button>
                        <button
                          onClick={() => deleteMovie(movie.id)}
                          className="bg-red-500/80 hover:bg-red-600 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 md:p-4">
                    <div className="flex items-start justify-between mb-1 md:mb-2">
                      <h3 className="font-bold text-xs md:text-base line-clamp-2 leading-tight flex-1 pr-1">{movie.title}</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap ${
                        movie.status === 'WATCHED' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {movie.status === 'WATCHED' ? 'Просмотрено' : 'В планах'}
                      </span>
                      <p className="text-[9px] md:text-xs text-slate-400">
                        {new Date(movie.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Правый сайдбар (скрыт на мобильных и планшетах) */}
        <aside className="hidden xl:block xl:col-span-3 space-y-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold mb-4">Активность друзей</h3>
            <div className="space-y-4">
              {[
                { name: 'Елена Б.', action: 'добавила "Барби" в Просмотрено', avatar: 'Е' },
                { name: 'Том Г.', action: 'оценил "Оппенгеймер"', avatar: 'Т', rating: 5 },
              ].map((friend, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm">
                    {friend.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{friend.name}</div>
                    <div className="text-xs text-slate-400">{friend.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold mb-4">Найти друзей</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск/Добавить"
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-orange-500 transition-colors text-sm"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </aside>
      </div>

      {/* Мобильная нижняя навигация */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 px-6 py-2 z-50">
        <div className="flex justify-around items-center">
          <button 
            onClick={() => { setActiveTab('all'); setShowSearch(false); }} 
            className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'all' && !showSearch ? 'text-orange-400' : 'text-slate-400'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px]">Все</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('watched'); setShowSearch(false); }} 
            className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'watched' ? 'text-orange-400' : 'text-slate-400'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px]">Просмотрено</span>
          </button>

          <button 
            onClick={() => setShowSearch(!showSearch)} 
            className="flex flex-col items-center justify-center -mt-6"
          >
            <div className="bg-orange-500 hover:bg-orange-600 rounded-full p-4 shadow-lg shadow-orange-500/40 transition-colors">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>

          <button 
            onClick={() => { setActiveTab('watchlist'); setShowSearch(false); }} 
            className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'watchlist' ? 'text-orange-400' : 'text-slate-400'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            <span className="text-[10px]">Планы</span>
          </button>

          <button className="flex flex-col items-center gap-1 p-2 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px]">Профиль</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
