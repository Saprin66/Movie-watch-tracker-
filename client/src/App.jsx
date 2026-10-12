import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import FriendsPanel from "./components/FriendsPanel";
import ProfileModal from "./components/ProfileModal";
import ReviewModal from "./components/ReviewModal";
import FriendsFeed from "./components/FriendsFeed";
import WhatToWatch from "./components/WhatToWatch";
import { SORT_OPTIONS, sortMovies } from "./utils/sortMovies";
import Icon from "./components/Icon";
import { Chip, MovieCard, Grid, Empty, Avatar } from "./components/ui";
import {
  ORANGE_FILTER,
  BTN_ORANGE,
  BTN_SOFT,
  BTN_RED,
  PANEL,
} from "./components/styles";
import { API_URL, TMDB_API_KEY, TMDB, POSTER, BACKDROP } from "./config";

// Модальное окно с деталями фильма
function MovieDetailsModal({ movie, onClose, onAdd }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movie) return;
    setLoading(true);
    const endpoint =
      movie.media_type === "tv"
        ? `${TMDB}/tv/${movie.id}`
        : `${TMDB}/movie/${movie.id}`;
    fetch(
      `${endpoint}?api_key=${TMDB_API_KEY}&language=ru-RU&append_to_response=credits`,
    )
      .then((res) => res.json())
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки деталей:", err);
        setLoading(false);
      });
  }, [movie]);

  if (!movie) return null;

  const title = details?.title || details?.name || movie.title || movie.name;
  const year = (details?.release_date || details?.first_air_date || "").slice(
    0,
    4,
  );
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}ч ${details.runtime % 60}м`
    : details?.episode_run_time?.[0]
      ? `${details.episode_run_time[0]}м/эп`
      : null;
  const rating = details?.vote_average?.toFixed(1);
  const overview = details?.overview || "Описание отсутствует";
  const genres = details?.genres || [];
  const director = details?.credits?.crew?.find(
    (c) => c.job === "Director",
  )?.name;
  const cast = details?.credits?.cast
    ?.slice(0, 5)
    .map((c) => c.name)
    .join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#171a33] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {details?.backdrop_path && (
          <div className="relative h-64 sm:h-80">
            <img
              src={`${BACKDROP}${details.backdrop_path}`}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#171a33] via-[#171a33]/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <Icon n="x" className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-6 sm:p-8 -mt-20 relative">
          <div className="flex flex-col sm:flex-row gap-6">
            {details?.poster_path && (
              <img
                src={`${POSTER}${details.poster_path}`}
                alt={title}
                className="w-40 sm:w-48 rounded-xl shadow-2xl border border-white/10 shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {year && <Chip>{year}</Chip>}
                {runtime && <Chip tone="orange">{runtime}</Chip>}
                {rating && (
                  <span className="flex items-center gap-1 text-sm text-yellow-400">
                    <Icon n="star" className="w-4 h-4" /> {rating}
                  </span>
                )}
                {movie.media_type === "tv" && <Chip tone="orange">Сериал</Chip>}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {title}
              </h2>

              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.map((g) => (
                    <span
                      key={g.id}
                      className="text-xs text-[#8a90b8] bg-white/5 px-2 py-1 rounded"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-sm text-[#c9cce6] leading-relaxed mb-4">
                {overview}
              </p>

              {director && (
                <div className="text-xs text-[#8a90b8] mb-1">
                  <span className="text-[#6f759e]">Режиссёр:</span> {director}
                </div>
              )}
              {cast && (
                <div className="text-xs text-[#8a90b8] mb-4">
                  <span className="text-[#6f759e]">В ролях:</span> {cast}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    onAdd("WATCHED");
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300"
                >
                  <Icon n="check" className="w-4 h-4" /> Смотрел
                </button>
                <button
                  onClick={() => {
                    onAdd("WATCHLIST");
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-[#f47c4f]/15 hover:bg-[#f47c4f]/25 text-[#f47c4f]"
                >
                  <Icon n="bookmark" className="w-4 h-4" /> В список
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovieTracker() {
  const [friendsLastWatched, setFriendsLastWatched] = useState({});
  const { user, token, logout, getFriends } = useAuth();
  const [activeTab, setActiveTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [movieFilter, setMovieFilter] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importResult, setImportResult] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [lastWatchedData, setLastWatchedData] = useState({});
  const [reviewMovieId, setReviewMovieId] = useState(null);
  const [sortMode, setSortMode] = useState(() => {
    try {
      const saved = localStorage.getItem("movieSort");
      return SORT_OPTIONS.some((o) => o.id === saved) ? saved : "added";
    } catch {
      return "added";
    }
  });

  const changeSort = (mode) => {
    setSortMode(mode);
    try {
      localStorage.setItem("movieSort", mode);
    } catch {
      /* без хранилища просто не запоминаем */
    }
  };

  useEffect(() => {
    if (
      token &&
      (activeTab === "movies" ||
        activeTab === "search" ||
        activeTab === "discover")
    )
      fetchMovies();
  }, [token, activeTab]);

  useEffect(() => {
    if (token && activeTab === "search" && !searchQuery.trim())
      loadPopularMovies();
  }, [token, activeTab]);

  useEffect(() => {
    if (token) loadFriends();
  }, [token]);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchMovies = async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMovies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки фильмов:", error);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await getFriends();
      const friendsList = Array.isArray(data) ? data : [];
      setFriends(friendsList);

      // Загружаем последний фильм для каждого друга параллельно
      const lwData = {};
      const promises = friendsList.map(async (friend) => {
        try {
          const res = await fetch(
            `${API_URL}/api/users/${friend.id}/last-watched`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            const movie = await res.json();
            if (movie) lwData[friend.id] = movie;
          }
        } catch (err) {
          console.error(`Ошибка загрузки фильма для ${friend.username}:`, err);
        }
      });

      await Promise.all(promises);
      setLastWatchedData(lwData);
    } catch (error) {
      console.error("Ошибка загрузки друзей:", error);
      setFriends([]);
    }
  };

  const loadPopularMovies = async () => {
    try {
      const res = await fetch(
        `${TMDB}/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU&page=1`,
      );
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Ошибка загрузки популярных фильмов:", error);
    }
  };

  const addMovie = async (movie) => {
    try {
      await fetch(`${API_URL}/api/movies`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(movie),
      });
      await fetchMovies();
    } catch (error) {
      console.error("Ошибка добавления:", error);
    }
  };

  const deleteMovie = async (id) => {
    try {
      await fetch(`${API_URL}/api/movies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMovies();
    } catch (error) {
      console.error("Ошибка удаления:", error);
    }
  };

  const deleteMovieByTmdbId = async (tmdbId, mediaType) => {
    const movieToDelete = movies.find(
      (m) => m.tmdbId === tmdbId && m.mediaType === mediaType,
    );
    if (movieToDelete) await deleteMovie(movieToDelete.id);
  };

  const updateMovieStatus = async (id, status) => {
    try {
      await fetch(`${API_URL}/api/movies/${id}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      await fetchMovies();
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);
    }
  };

  const saveReview = async (id, { rating, comment }) => {
    try {
      const res = await fetch(`${API_URL}/api/movies/${id}/review`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error || "Не удалось сохранить отзыв" };
      }
      await fetchMovies();
      return { ok: true };
    } catch (error) {
      console.error("Ошибка сохранения отзыва:", error);
      return { ok: false, error: "Ошибка соединения с сервером" };
    }
  };

  const searchMovies = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      loadPopularMovies();
      return;
    }
    try {
      const res = await fetch(
        `${TMDB}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ru-RU`,
      );
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Ошибка поиска:", error);
    }
  };

  const handleDocxImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    setImportResult(null);

    const success = [];
    const failed = [];
    const skipped = [];

    try {
      let text;
      if (file.name.toLowerCase().endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const extractRawText =
          mammoth.extractRawText || mammoth.default.extractRawText;
        const result = await extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        text = result.value;
      } else {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file, "UTF-8");
        });
      }

      const cleanText = text
        .replace(/^\uFEFF/, "")
        .replace(/[\uFEFF\u200B\u200C\u200D\u00A0\u202F\u2060]/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      const lines = cleanText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const parsedMovies = [];

      for (const line of lines) {
        if (line.toLowerCase() === "фильмы") continue;
        const ratingMatch = line.match(
          /\s+(\d+[.,]\d+|\d+)\s*(?:\/\s*\d+)?\s*$/,
        );

        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1].replace(",", "."));
          const title = line.replace(ratingMatch[0], "").trim();
          if (title.length > 0 && rating >= 1 && rating <= 10)
            parsedMovies.push({ title, status: "WATCHED", rating });
          else if (title.length > 0)
            parsedMovies.push({ title, status: "WATCHLIST" });
        } else {
          const title = line.replace(/\s*[+]+\s*$/, "").trim();
          if (title.length > 0)
            parsedMovies.push({ title, status: "WATCHLIST" });
        }
      }

      if (parsedMovies.length === 0) {
        alert("Не удалось найти фильмы в файле.");
        setImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: parsedMovies.length });

      for (let i = 0; i < parsedMovies.length; i++) {
        const { title, status, rating } = parsedMovies[i];

        try {
          const searchRes = await fetch(
            `${TMDB}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=ru-RU`,
          );
          const searchData = await searchRes.json();
          const item = (searchData.results || []).find(
            (r) => r.media_type === "movie" || r.media_type === "tv",
          );

          if (item) {
            const alreadyAdded = movies.some(
              (m) => m.tmdbId === item.id && m.mediaType === item.media_type,
            );
            const itemTitle = item.title || item.name;
            if (alreadyAdded) {
              skipped.push({ title, tmdbTitle: itemTitle });
            } else {
              await fetch(`${API_URL}/api/movies`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                  tmdbId: item.id,
                  title: itemTitle,
                  posterUrl: item.poster_path
                    ? `${POSTER}${item.poster_path}`
                    : null,
                  status,
                  rating,
                  mediaType: item.media_type,
                }),
              });
              success.push({
                title,
                tmdbTitle: itemTitle,
                status,
                mediaType: item.media_type,
              });
              setMovies((prev) => [
                ...prev,
                {
                  tmdbId: item.id,
                  title: itemTitle,
                  status,
                  mediaType: item.media_type,
                },
              ]);
            }
          } else {
            failed.push({ title });
          }
        } catch (err) {
          console.error("Ошибка обработки:", title, err);
          failed.push({ title });
        }

        setImportProgress((prev) => ({ ...prev, current: i + 1 }));
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      await fetchMovies();
      setImportResult({ success, failed, skipped });
    } catch (error) {
      console.error("Ошибка импорта:", error);
      alert(`Ошибка при чтении файла: ${error.message}`);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const reviewMovie = movies.find((m) => m.id === reviewMovieId) || null;

  const filteredMovies = sortMovies(
    movies.filter((m) => {
      if (movieFilter === "watchlist") return m.status === "WATCHLIST";
      if (movieFilter === "watched") return m.status === "WATCHED";
      return true;
    }),
    sortMode,
  );

  const watchlistCount = movies.filter((m) => m.status === "WATCHLIST").length;
  const watchedCount = movies.filter((m) => m.status === "WATCHED").length;
  const addedMovieIds = new Set(
    movies.map((m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`),
  );

  //БОКОВАЯ ПАНЕЛЬ С ВКЛАДКАМИ

  const navItems = [
    { id: "movies", label: "Мой список", icon: "layout-dashboard" },
    {
      id: "discover",
      label: "Что смотреть",
      short: "Смотреть",
      icon: "sparkles",
    },
    { id: "feed", label: "Лента друзей", short: "Лента", icon: "activity" },
    { id: "search", label: "Искать", icon: "compass" },
    { id: "friends", label: "Друзья", icon: "users" },
    { id: "profile", label: "Настройки", icon: "settings" },
  ];

  const tabs = [
    { id: "all", label: "Все" },
    { id: "watched", label: "Просмотрено" },
    { id: "watchlist", label: "Буду смотреть" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1226] bg-[radial-gradient(ellipse_at_top_left,rgba(244,124,79,0.12),transparent_50%)] text-[#c9cce6]">
      <header className="sticky top-0 z-40 bg-[#131631]/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-4 px-4 lg:px-6 h-16">
          <div className="flex items-center gap-2 lg:w-52 shrink-0">
            <Icon n="clapperboard" className={`w-7 h-7 ${ORANGE_FILTER}`} />
            <span className="hidden sm:block text-lg font-bold text-white">
              Movie<span className="text-[#f47c4f]">Grade</span>
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault(); // Предотвращаем перезагрузку страницы при нажатии Enter/Поиск
              if (activeTab !== "search") setActiveTab("search");
              searchMovies(searchQuery); // Явно запускаем поиск по текущему значению
            }}
            className="relative flex-1 max-w-xl flex gap-2"
          >
            <div className="relative flex-1">
              <Icon
                n="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 w-4 h-4"
              />
              <input
                type="search" /* 🔑 ГЛАВНОЕ: показывает кнопку с лупой на мобильных */
                inputMode="search"
                autoComplete="off"
                placeholder="Поиск фильмов"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "search") setActiveTab("search");
                  searchMovies(e.target.value); // Оставляем мгновенный поиск при вводе
                }}
                className="w-full bg-[#1c2040] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60 focus:ring-1 focus:ring-[#f47c4f]/30 transition-all"
              />
            </div>

            {/* 🔑 Видимая кнопка для удобного нажатия пальцем на телефоне */}
            <button
              type="submit"
              className="bg-[#f47c4f] hover:bg-[#f47c4f]/90 active:scale-95 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-[#f47c4f]/20"
            >
              <Icon n="search" className="w-4 h-4 sm:hidden" />{" "}
              {/* Иконка только на телефонах */}
              <span className="hidden sm:inline">Найти</span>{" "}
              {/* Текст на планшетах и ПК */}
            </button>
          </form>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <Avatar name={user?.username} />
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-semibold text-white">
                {user?.username}
              </div>
              <div className="flex gap-3 text-xs text-[#8a90b8]">
                <button
                  onClick={() => setActiveTab("profile")}
                  className="hover:text-white"
                >
                  Профиль
                </button>
                <button onClick={logout} className="hover:text-white">
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-white/5 bg-[#101328] p-5">
          <h2 className="text-xl font-semibold text-white mb-4">
            Журнал {user?.username}
          </h2>
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={user?.username} size="w-14 h-14" text="text-xl" />
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">
                {user?.username}
              </div>
              <div className="text-xs text-[#8a90b8] truncate">
                {user?.email}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-white/5 bg-[#171a33] rounded-xl py-3 mb-6 text-center">
            {[
              { v: movies.length, l: "Всего" },
              { v: watchedCount, l: "Просмотрено" },
              { v: watchlistCount, l: "Посмотреть" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-lg font-semibold text-white">{s.v}</div>
                <div className="text-[10px] text-[#8a90b8]">{s.l}</div>
              </div>
            ))}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === item.id
                    ? "bg-[#1f2347] text-[#f47c4f]"
                    : "text-[#9aa0c8] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  n={item.icon}
                  className={`w-[18px] h-[18px] ${activeTab === item.id ? ORANGE_FILTER : "opacity-70"}`}
                />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 pb-28 lg:pb-8">
          {activeTab === "movies" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-3xl font-semibold text-white">
                  Журнал {user?.username}
                </h2>
                <div className="flex gap-2">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer ${BTN_SOFT}`}
                  >
                    <Icon n="download" /> Импорт
                    <input
                      type="file"
                      accept=".txt,.docx"
                      onChange={handleDocxImport}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setActiveTab("search")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${BTN_ORANGE}`}
                  >
                    <Icon
                      n="plus"
                      className="w-4 h-4 [filter:brightness(0.1)]"
                    />{" "}
                    Новая запись
                  </button>
                </div>
              </div>

              {importing && (
                <div className={`${PANEL} p-3`}>
                  <div className="text-sm mb-2">
                    Импорт: {importProgress.current} из {importProgress.total}
                  </div>
                  <div className="h-1.5 bg-[#0f1226] rounded">
                    <div
                      className="h-full bg-[#f47c4f] rounded transition-all"
                      style={{
                        width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-end justify-between gap-x-6 border-b border-white/5">
                <div className="flex gap-6">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMovieFilter(t.id)}
                    className={`pb-3 -mb-px text-sm border-b-2 transition-colors ${
                      movieFilter === t.id
                        ? "text-[#f47c4f] border-[#f47c4f]"
                        : "text-[#8a90b8] border-transparent hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                </div>
                <label className="flex items-center gap-2 pb-2 text-xs text-[#8a90b8]">
                  Сортировка
                  <select
                    value={sortMode}
                    onChange={(e) => changeSort(e.target.value)}
                    className="bg-[#1c2040] border border-white/5 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#f47c4f]/60"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredMovies.length === 0 ? (
                <Empty text="Здесь пока пусто. Нажми «Новая запись» и добавь первый фильм." />
              ) : (
                <Grid>
                  {filteredMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      poster={movie.posterUrl}
                      title={movie.title}
                      onClick={() => setReviewMovieId(movie.id)}
                      chips={
                        <>
                          <Chip
                            tone={movie.status === "WATCHED" ? "green" : "blue"}
                          >
                            {movie.status === "WATCHED"
                              ? "Просмотрено"
                              : "Буду смотреть"}
                          </Chip>
                          {movie.mediaType === "tv" && (
                            <Chip tone="orange">Сериал</Chip>
                          )}
                          {movie.rating && (
                            <Chip tone="orange">
                              <Icon
                                n="star"
                                className={`w-3 h-3 inline -mt-0.5 mr-0.5 ${ORANGE_FILTER}`}
                              />
                              {movie.rating}
                            </Chip>
                          )}
                        </>
                      }
                      footerLeft={
                        <>
                          <Icon
                            n="calendar"
                            className="w-3.5 h-3.5 opacity-60"
                          />
                          {movie.createdAt
                            ? new Date(
                                movie.status === "WATCHED" && movie.watchedAt
                                  ? movie.watchedAt
                                  : movie.createdAt,
                              ).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : movie.mediaType === "tv"
                              ? "Сериал"
                              : "Фильм"}
                        </>
                      }
                      actions={
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateMovieStatus(
                                movie.id,
                                movie.status === "WATCHLIST"
                                  ? "WATCHED"
                                  : "WATCHLIST",
                              );
                            }}
                            title={
                              movie.status === "WATCHLIST"
                                ? "Отметить просмотренным"
                                : "Вернуть в список"
                            }
                            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[11px] ${BTN_SOFT}`}
                          >
                            <Icon
                              n={
                                movie.status === "WATCHLIST"
                                  ? "check"
                                  : "bookmark"
                              }
                              className="w-3.5 h-3.5"
                            />
                            {movie.status === "WATCHLIST"
                              ? "Готово"
                              : "В список"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMovie(movie.id);
                            }}
                            title="Удалить"
                            className={`px-1.5 rounded-md ${BTN_RED}`}
                          >
                            <Icon n="trash-2" className="w-3.5 h-3.5" />
                          </button>
                        </>
                      }
                    />
                  ))}
                </Grid>
              )}
            </div>
          )}

          {activeTab === "search" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-semibold text-white">
                  Открыть новое
                </h2>
                <p className="text-sm text-[#8a90b8]">
                  Нажми на карточку, чтобы узнать подробности и добавить
                </p>
              </div>

              {searchResults.length > 0 ? (
                <>
                  {!searchQuery.trim() && (
                    <h3 className="flex items-center gap-2 text-lg text-[#f47c4f]">
                      <Icon n="flame" className={`w-5 h-5 ${ORANGE_FILTER}`} />{" "}
                      Сейчас популярно
                    </h3>
                  )}
                  <Grid>
                    {searchResults.map((movie) => {
                      const mediaType = movie.media_type === "tv" ? "tv" : "movie";
                      const isAdded = addedMovieIds.has(
                        `${mediaType}-${movie.id}`,
                      );
                      const title = movie.title || movie.name;
                      const year = (
                        movie.release_date ||
                        movie.first_air_date ||
                        ""
                      ).slice(0, 4);
                      return (
                        <MovieCard
                          key={`${movie.media_type || "movie"}-${movie.id}`}
                          poster={
                            movie.poster_path
                              ? `${POSTER}${movie.poster_path}`
                              : null
                          }
                          title={title}
                          chips={
                            <>
                              {year && <Chip>{year}</Chip>}
                              {isAdded && <Chip tone="green">В журнале</Chip>}
                            </>
                          }
                          footerLeft={
                            movie.vote_average ? (
                              <>
                                <Icon
                                  n="star"
                                  className="w-3.5 h-3.5 opacity-60"
                                />{" "}
                                {movie.vote_average.toFixed(1)}
                              </>
                            ) : null
                          }
                          onClick={() => setSelectedMovie(movie)}
                          actions={
                            isAdded ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMovieByTmdbId(movie.id, mediaType);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[11px] ${BTN_RED}`}
                              >
                                <Icon n="x" className="w-3.5 h-3.5" /> Убрать
                              </button>
                            ) : null
                          }
                        />
                      );
                    })}
                  </Grid>
                </>
              ) : (
                <Empty
                  text={
                    searchQuery
                      ? "Ничего не найдено"
                      : "Введите название для поиска"
                  }
                />
              )}
            </div>
          )}

          {activeTab === "discover" && (
            <WhatToWatch
              movies={movies}
              onOpenMovie={setSelectedMovie}
              onMarkWatched={(id) => updateMovieStatus(id, "WATCHED")}
            />
          )}

          {activeTab === "feed" && (
            <FriendsFeed
              token={token}
              onUserClick={setSelectedUserId}
              onOpenFriends={() => setActiveTab("friends")}
            />
          )}

          {activeTab === "friends" && (
            <div className="max-w-3xl">
              <h2 className="text-3xl font-semibold text-white mb-6">
                Сообщество
              </h2>
              <FriendsPanel onUserClick={setSelectedUserId} />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl font-semibold text-white">Профиль</h2>
              <div className={`${PANEL} p-6 flex items-center gap-5`}>
                <Avatar
                  name={user?.username}
                  size="w-20 h-20"
                  text="text-3xl"
                />
                <div>
                  <div className="text-2xl font-semibold text-white">
                    {user?.username}
                  </div>
                  <div className="text-sm text-[#8a90b8]">{user?.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: movies.length, l: "Всего в журнале" },
                  { v: watchedCount, l: "Просмотрено" },
                  { v: friends.length, l: "Друзей" },
                ].map((s) => (
                  <div key={s.l} className={`${PANEL} p-4`}>
                    <div className="text-3xl font-semibold text-[#f47c4f]">
                      {s.v}
                    </div>
                    <div className="text-xs text-[#8a90b8]">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className={`${PANEL} p-5`}>
                <h3 className="flex items-center gap-2 text-lg text-white mb-1">
                  <Icon n="download" className="w-5 h-5" /> Импорт из файла
                </h3>
                <p className="text-sm text-[#8a90b8] mb-4">
                  Загрузите .txt или .docx файл со списком фильмов
                </p>
                <label
                  className={`block w-full text-center py-2.5 rounded-lg cursor-pointer ${importing ? "bg-[#262b55] text-[#8a90b8] cursor-not-allowed" : BTN_ORANGE}`}
                >
                  {importing
                    ? `Импорт... ${importProgress.current}/${importProgress.total}`
                    : "Выбрать файл"}
                  <input
                    type="file"
                    accept=".txt,.docx"
                    onChange={handleDocxImport}
                    disabled={importing}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={() => setSelectedUserId(user?.id)}
                className={`w-full py-2.5 rounded-lg font-medium ${BTN_SOFT}`}
              >
                Редактировать профиль
              </button>
              <button
                onClick={logout}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium ${BTN_RED}`}
              >
                <Icon n="log-out" /> Выйти из аккаунта
              </button>
            </div>
          )}
        </main>

        <aside className="hidden xl:block w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-l border-white/5 bg-[#101328] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Друзья</h3>

          {friends.length === 0 ? (
            <p className="text-sm text-[#8a90b8] text-center py-4">
              Пока никого. Найди друзей во вкладке «Друзья».
            </p>
          ) : (
            <div className="space-y-3">
              {friends.map((f) => {
                // Расчет времени онлайн
                const lastSeenDate = f.lastSeen ? new Date(f.lastSeen) : null;
                const minutesAgo = lastSeenDate
                  ? Math.floor((new Date() - lastSeenDate) / 1000 / 60)
                  : null;
                const isOnline = minutesAgo !== null && minutesAgo < 5;

                const formatLastSeen = () => {
                  if (!lastSeenDate) return "Не в сети";
                  if (minutesAgo < 1) return "Только что";
                  if (minutesAgo < 60) return `${minutesAgo} мин назад`;
                  const hours = Math.floor(minutesAgo / 60);
                  if (hours < 24) return `${hours} ч назад`;
                  const days = Math.floor(hours / 24);
                  return `${days} дн назад`;
                };

                // Получаем данные о последнем фильме (если они есть в стейте lastWatchedData)
                const lastMovie = lastWatchedData[f.id];

                return (
                  <button
                    key={f.id}
                    onClick={() => f.id && setSelectedUserId(f.id)}
                    className="w-full flex items-start gap-3 text-left hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors group"
                  >
                    {/* Аватар с индикатором онлайна */}
                    <div className="relative shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center font-bold text-sm text-white shadow-lg">
                        {f.username?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#101328] transition-colors ${
                          isOnline
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                            : "bg-gray-500"
                        }`}
                      ></div>
                    </div>

                    {/* Информация о друге */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-[#f47c4f] transition-colors">
                        {f.username}
                      </div>
                      <div
                        className={`text-[11px] font-medium ${isOnline ? "text-emerald-400" : "text-[#6f759e]"}`}
                      >
                        {isOnline ? "Онлайн" : formatLastSeen()}
                      </div>

                      {/* Последний просмотренный фильм */}
                      {lastMovie && (
                        <div className="mt-1.5 flex items-center gap-2 bg-[#1c2040] rounded-md p-1.5 border border-white/5">
                          {lastMovie.posterUrl ? (
                            <img
                              src={lastMovie.posterUrl}
                              alt=""
                              className="w-6 h-9 object-cover rounded-sm shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-9 bg-[#262b55] rounded-sm shrink-0 flex items-center justify-center">
                              <Icon n="film" className="w-3 h-3 opacity-50" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="text-[10px] text-[#6f759e]">
                              Смотрел
                            </div>
                            <div
                              className="text-[11px] text-[#c9cce6] truncate"
                              title={lastMovie.title}
                            >
                              {lastMovie.title}
                            </div>
                            {lastMovie.rating && (
                              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#f47c4f]">
                                <Icon
                                  n="star"
                                  className={`w-3 h-3 ${ORANGE_FILTER}`}
                                />
                                {lastMovie.rating}/10
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Кнопка поиска друзей */}
          <div className="mt-8 pt-5 border-t border-white/5">
            <button
              onClick={() => setActiveTab("friends")}
              className="w-full flex items-center gap-2 bg-[#1c2040] hover:bg-[#262b55] rounded-lg px-3 py-2.5 text-sm text-[#6f759e] hover:text-white text-left transition-colors"
            >
              <Icon n="search" className="w-4 h-4 opacity-50" />
              Поиск и добавление
            </button>
          </div>
        </aside>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#131631] border-t border-white/5 flex justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1 py-1"
          >
            <Icon
              n={item.icon}
              className={`w-5 h-5 ${activeTab === item.id ? ORANGE_FILTER : "opacity-60"}`}
            />
            <span
              className={`max-w-full truncate text-[10px] ${activeTab === item.id ? "text-[#f47c4f]" : "text-[#8a90b8]"}`}
            >
              {item.short ?? item.label}
            </span>
          </button>
        ))}
      </nav>

      {selectedUserId && (
        <ProfileModal
          userId={selectedUserId}
          token={token}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onAdd={(status) =>
            addMovie({
              tmdbId: selectedMovie.id,
              title: selectedMovie.title || selectedMovie.name,
              posterUrl: selectedMovie.poster_path
                ? `${POSTER}${selectedMovie.poster_path}`
                : null,
              status,
              mediaType: selectedMovie.media_type === "tv" ? "tv" : "movie",
            })
          }
        />
      )}

      {reviewMovie && (
        <ReviewModal
          key={reviewMovie.id}
          movie={reviewMovie}
          onClose={() => setReviewMovieId(null)}
          onSave={(review) => saveReview(reviewMovie.id, review)}
          onToggleStatus={() =>
            updateMovieStatus(
              reviewMovie.id,
              reviewMovie.status === "WATCHED" ? "WATCHLIST" : "WATCHED",
            )
          }
          onDelete={async () => {
            await deleteMovie(reviewMovie.id);
            setReviewMovieId(null);
          }}
        />
      )}

      {importResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171a33] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-semibold text-white">
                Результаты импорта
              </h3>
              <button
                onClick={() => setImportResult(null)}
                className="p-1.5 hover:bg-white/10 rounded-md"
              >
                <Icon n="x" className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {
                  n: importResult.success.length,
                  label: "Добавлено",
                  color: "text-emerald-300",
                },
                {
                  n: importResult.skipped.length,
                  label: "Пропущено",
                  color: "text-sky-300",
                },
                {
                  n: importResult.failed.length,
                  label: "Не найдено",
                  color: "text-red-300",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[#1c2040] rounded-xl p-3 text-center"
                >
                  <div className={`text-3xl font-semibold ${s.color}`}>
                    {s.n}
                  </div>
                  <div className="text-xs text-[#8a90b8]">{s.label}</div>
                </div>
              ))}
            </div>

            {importResult.failed.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm text-red-300 mb-2">Не найдено:</h4>
                <div className="bg-[#0f1226] rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
                  {importResult.failed.map((m, i) => (
                    <div key={i} className="text-xs truncate">
                      {m.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setImportResult(null)}
              className={`w-full py-2.5 rounded-lg ${BTN_ORANGE}`}
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const { token, user } = useAuth();
  if (token && user && !user.isVerified) return <AuthScreen />;
  return token ? <MovieTracker /> : <AuthScreen />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
