import { useState, useEffect } from 'react'

// ВСТАВЬ СЮДА СВОЙ API КЛЮЧ ОТ TMDB
const TMDB_API_KEY = '64608a2a9d2e16b7cd99fcde547034f3' 
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

function App() {
  const [movies, setMovies] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('WATCHLIST')

  // Загружаем сохраненные фильмы при старте
  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      const response = await fetch('https://movie-watch-tracker.onrender.com/api/movies')
      const data = await response.json()
      setMovies(data)
    } catch (error) {
      console.error('Ошибка при загрузке фильмов:', error)
    }
  }

  // Поиск фильмов через TMDB
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=ru-RU`
      )
      const data = await response.json()
      setSearchResults(data.results || [])
    } catch (error) {
      console.error('Ошибка поиска:', error)
    } finally {
      setIsSearching(false)
    }
  }

  //      const response = await fetch('https://movie-tracker-backend.onrender.com/api/movies'

  // Добавление выбранного фильма на наш бэкенд
  const addMovie = async (movie) => {
    try {
      const response = await fetch('https://movie-watch-tracker.onrender.com/api/moviesgit add .', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: movie.id,
          title: movie.title,
          posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
          status: selectedStatus
        })
      })

      if (response.ok) {
        setSearchQuery('')
        setSearchResults([])
        fetchMovies() // Обновляем список
        alert(`Фильм "${movie.title}" добавлен!`)
      } else {
        alert('Ошибка при добавлении фильма')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert('Не удалось связаться с сервером')
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>🎬 Мои Фильмы</h1>
      
      {/* Блок поиска */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Найти и добавить фильм</h3>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Введите название фильма (например, Интерстеллар)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <button 
            type="submit" 
            disabled={isSearching}
            style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
          >
            {isSearching ? 'Поиск...' : 'Найти'}
          </button>
        </form>

        {/* Выбор статуса перед добавлением */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '15px', fontWeight: 'bold' }}>Добавить как:</label>
          <label style={{ marginRight: '15px' }}>
            <input 
              type="radio" 
              name="status" 
              value="WATCHLIST" 
              checked={selectedStatus === 'WATCHLIST'} 
              onChange={(e) => setSelectedStatus(e.target.value)} 
            /> 📌 Буду смотреть
          </label>
          <label>
            <input 
              type="radio" 
              name="status" 
              value="WATCHED" 
              checked={selectedStatus === 'WATCHED'} 
              onChange={(e) => setSelectedStatus(e.target.value)} 
            /> ✅ Просмотрено
          </label>
        </div>

        {/* Результаты поиска */}
        {searchResults.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginTop: '20px' }}>
            {searchResults.map((movie) => (
              <div key={movie.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
                <img 
                  src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/150x225?text=No+Image'} 
                  alt={movie.title} 
                  style={{ width: '100%', height: '225px', objectFit: 'cover' }} 
                />
                <div style={{ padding: '10px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', height: '40px', overflow: 'hidden' }}>
                    {movie.title}
                  </p>
                  <button 
                    onClick={() => addMovie(movie)}
                    style={{ width: '100%', padding: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    + Добавить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Список добавленных фильмов */}
      <h2>Мой список</h2>
      {movies.length === 0 ? (
        <p>Список пуст. Найди фильм через поиск выше!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
          {movies.map((movie) => (
            <div key={movie.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <img 
                src={movie.posterUrl || 'https://via.placeholder.com/150x225?text=No+Image'} 
                alt={movie.title} 
                style={{ width: '100%', height: '270px', objectFit: 'cover' }} 
              />
              <div style={{ padding: '10px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px' }}>{movie.title}</h3>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  backgroundColor: movie.status === 'WATCHED' ? '#4CAF50' : '#FF9800',
                  color: 'white'
                }}>
                  {movie.status === 'WATCHED' ? '✅ Просмотрено' : '📌 Буду смотреть'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
