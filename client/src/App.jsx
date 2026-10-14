import { useState, useEffect, useRef, useMemo } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import Footer from "./components/Footer";
import PrivacyPolicy from "./components/PrivacyPolicy";
import { useHashRoute } from "./hooks/useHashRoute";
import { POLICY_HASH, CONTACT_EMAIL } from "./legal";
import FriendsPanel from "./components/FriendsPanel";
import ProfileModal from "./components/ProfileModal";
import ReviewModal from "./components/ReviewModal";
import MovieDetailsModal from "./components/MovieDetailsModal";
import FriendsFeed from "./components/FriendsFeed";
import HomeFeed from "./components/HomeFeed";
import WhatToWatch from "./components/WhatToWatch";
import { SORT_OPTIONS, sortMovies } from "./utils/sortMovies";
import MovieFilters from "./components/MovieFilters";
import {
  DEFAULT_FILTERS,
  collectFacets,
  filterMovies,
  isFiltering,
} from "./utils/filterMovies";
import { metaFromTmdb } from "./utils/genres";
import { useMetaBackfill } from "./hooks/useMetaBackfill";
import Icon from "./components/Icon";
import { Chip, MovieCard, Grid, Empty, Avatar } from "./components/ui";
import {
  ORANGE_FILTER,
  BTN_ORANGE,
  BTN_SOFT,
  BTN_RED,
  PANEL,
} from "./components/styles";
import { API_URL, TMDB_API_KEY, TMDB, POSTER } from "./config";

function MovieTracker() {
  const [friendsLastWatched, setFriendsLastWatched] = useState({});
  const { user, token, logout, getFriends, getFriendRequests } = useAuth();
  const [activeTab, setActiveTab] = useState("movies");
  const [requestsCount, setRequestsCount] = useState(0);
  const [movies, setMovies] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [catalogType, setCatalogType] = useState("movie");
  const [catalogGenres, setCatalogGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [searchMode, setSearchMode] = useState("text");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showcaseMovieIds, setShowcaseMovieIds] = useState([]);
  const [showcaseLoaded, setShowcaseLoaded] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [showcaseSaveError, setShowcaseSaveError] = useState("");
  const [profileFriendsOpen, setProfileFriendsOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
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
  useEffect(() => {
    const openProfileSettings = () => setActiveTab("profile-settings");
    window.addEventListener("moviegrade:open-profile-settings", openProfileSettings);
    return () => window.removeEventListener("moviegrade:open-profile-settings", openProfileSettings);
  }, []);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handlePointerDown = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setAvatarMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [avatarMenuOpen]);

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
    if (!user?.id || !token) return;
    let cancelled = false;
    const loadShowcase = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Не удалось загрузить витрину");
        const data = await response.json();
        if (!cancelled && Array.isArray(data.showcaseMovieIds)) {
          setShowcaseMovieIds(data.showcaseMovieIds.slice(0, 3));
          localStorage.setItem(`movieShowcase:${user.id}`, JSON.stringify(data.showcaseMovieIds.slice(0, 3)));
        }
      } catch {
        try {
          const saved = JSON.parse(localStorage.getItem(`movieShowcase:${user.id}`) || "[]");
          if (!cancelled) setShowcaseMovieIds(Array.isArray(saved) ? saved.slice(0, 3) : []);
        } catch { if (!cancelled) setShowcaseMovieIds([]); }
      } finally {
        if (!cancelled) setShowcaseLoaded(true);
      }
    };
    loadShowcase();
    return () => { cancelled = true; };
  }, [user?.id, token]);

  useEffect(() => {
    if (!showcaseLoaded || !user?.id) return;
    try {
      localStorage.setItem(`movieShowcase:${user.id}`, JSON.stringify(showcaseMovieIds.slice(0, 3)));
    } catch {
      // Если хранилище недоступно, витрина останется активной до перезагрузки.
    }
  }, [showcaseMovieIds, showcaseLoaded, user?.id]);

  const toggleShowcaseMovie = (movie) => {
    const id = String(movie.id);
    setShowcaseMovieIds((prev) => prev.includes(id)
      ? prev.filter((item) => item !== id)
      : prev.length < 3 ? [...prev, id] : prev);
  };

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const facets = useMemo(() => collectFacets(movies), [movies]);
  const metaPending = movies.filter((m) => m.id && !m.metaCheckedAt).length;

  // Старым записям дозаполняем год и жанры, чтобы работали фильтры
  useMetaBackfill({
    movies,
    token,
    onUpdated: (updated) =>
      setMovies((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
      ),
  });

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
    // Не загружаем популярные фильмы поверх результатов, выбранных фильтрами.
    if (
      token &&
      activeTab === "search" &&
      !searchQuery.trim() &&
      searchMode !== "filters"
    ) {
      loadPopularMovies();
    }
  }, [token, activeTab, searchQuery, searchMode]);

  useEffect(() => {
    let cancelled = false;
    const loadGenres = async () => {
      try {
        const res = await fetch(
          `${TMDB}/genre/${catalogType}/list?api_key=${TMDB_API_KEY}&language=ru-RU`,
        );
        if (!res.ok) throw new Error("Не удалось загрузить жанры TMDB");
        const data = await res.json();
        if (!cancelled) setCatalogGenres(data.genres || []);
      } catch (error) {
        if (!cancelled) setCatalogError(error.message || "Не удалось загрузить жанры");
      }
    };
    loadGenres();
    return () => { cancelled = true; };
  }, [catalogType]);

  useEffect(() => {
    if (token) loadFriends();
  }, [token]);

  // Бейдж входящих заявок: при входе, раз в минуту и при возврате в приложение
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const data = await getFriendRequests();
      if (!cancelled) setRequestsCount(Array.isArray(data) ? data.length : 0);
    };

    refresh();
    const timer = setInterval(refresh, 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
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
    // Защита от гонки запросов: ответ популярного каталога не должен
    // перезаписывать результаты фильтров, если они загрузились позже.
    const seq = ++searchSeq.current;
    if (!TMDB_API_KEY) {
      setCatalogError("На сайте не настроен ключ TMDB. Добавьте VITE_TMDB_API_KEY в переменные окружения хостинга и пересоберите проект.");
      return;
    }
    try {
      const res = await fetch(
        `${TMDB}/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU&page=1`,
      );
      const data = await res.json();
      if (seq !== searchSeq.current) return;
      if (!res.ok) throw new Error(data.status_message || "Не удалось загрузить популярные фильмы TMDB");
      setSearchResults(data.results || []);
      setCatalogError("");
    } catch (error) {
      if (seq !== searchSeq.current) return;
      console.error("Ошибка загрузки популярных фильмов:", error);
      setCatalogError(error.message || "Ошибка соединения с TMDB");
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

  // Номер последнего запроса: запоздавший ответ на старый запрос не перезапишет свежий
  const searchSeq = useRef(0);
  const searchTimer = useRef(null);

  const searchMovies = async (query) => {
    clearTimeout(searchTimer.current);
    setSearchMode("text");
    setCatalogError("");
    const seq = ++searchSeq.current;

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
      if (seq !== searchSeq.current) return;
      setSearchResults(
        (data.results || []).filter((r) => r.media_type !== "person"),
      );
    } catch (error) {
      console.error("Ошибка поиска:", error);
    }
  };

  const discoverMovies = async (page = 1) => {
    const seq = ++searchSeq.current;
    setCatalogLoading(true);
    setCatalogError("");
    setSearchMode("filters");
    setCatalogPage(page);
    if (!TMDB_API_KEY) {
      setCatalogError("На сайте не настроен ключ TMDB. Добавьте VITE_TMDB_API_KEY в переменные окружения хостинга и пересоберите проект.");
      setSearchResults([]);
      setCatalogLoading(false);
      return;
    }
    const fromYear = yearFrom.trim();
    const toYear = yearTo.trim();
    if ((fromYear && !/^\d{4}$/.test(fromYear)) || (toYear && !/^\d{4}$/.test(toYear))) {
      setCatalogError("Укажи год четырьмя цифрами, например 2000.");
      setCatalogLoading(false);
      return;
    }
    if (fromYear && toYear && Number(fromYear) > Number(toYear)) {
      setCatalogError("Год «от» не может быть больше года «до».");
      setCatalogLoading(false);
      return;
    }
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: "ru-RU",
      page: String(page),
      sort_by: sortBy,
      "vote_count.gte": "10",
    });
    if (selectedGenres.length) params.set("with_genres", selectedGenres.join(","));
    if (minRating !== "0") params.set("vote_average.gte", minRating);
    if (yearFrom) params.set(catalogType === "tv" ? "first_air_date.gte" : "primary_release_date.gte", `${yearFrom}-01-01`);
    if (yearTo) params.set(catalogType === "tv" ? "first_air_date.lte" : "primary_release_date.lte", `${yearTo}-12-31`);
    try {
      const res = await fetch(`${TMDB}/discover/${catalogType}?${params.toString()}`);
      const data = await res.json();
      if (seq !== searchSeq.current) return;
      if (!res.ok) {
        const message = data.status_message || "Не удалось выполнить подборку TMDB";
        throw new Error(message);
      }
      setSearchResults((data.results || []).map((item) => ({ ...item, media_type: catalogType })));
      setCatalogTotalPages(Math.min(data.total_pages || 1, 500));
    } catch (error) {
      if (seq !== searchSeq.current) return;
      console.error("Ошибка подбора по фильтрам:", error);
      setCatalogError(error.message || "Ошибка соединения с TMDB. Проверьте ключ API и настройки сайта.");
      setSearchResults([]);
    } finally {
      if (seq === searchSeq.current) setCatalogLoading(false);
    }
  };

  const resetCatalogFilters = () => {
    setSelectedGenres([]);
    setYearFrom("");
    setYearTo("");
    setMinRating("0");
    setSortBy("popularity.desc");
    setCatalogPage(1);
  };

  // Поиск при вводе: запрос уходит, когда человек на мгновение остановился
  const searchMoviesDebounced = (query) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchMovies(query), 350);
  };

  useEffect(() => () => clearTimeout(searchTimer.current), []);

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
                  ...metaFromTmdb(item),
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

  const byStatus = movies.filter((m) => {
    if (movieFilter === "watchlist") return m.status === "WATCHLIST";
    if (movieFilter === "watched") return m.status === "WATCHED";
    return true;
  });
  const filteredMovies = sortMovies(filterMovies(byStatus, filters), sortMode);

  const watchlistCount = movies.filter((m) => m.status === "WATCHLIST").length;
  const watchedCount = movies.filter((m) => m.status === "WATCHED").length;
  const addedMovieIds = new Set(
    movies.map((m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`),
  );

  //БОКОВАЯ ПАНЕЛЬ С ВКЛАДКАМИ

  const navItems = [
    { id: "home", label: "Главная", short: "Главная", icon: "house" },
    { id: "movies", label: "Мой список", icon: "layout-dashboard" },
    {
      id: "discover",
      label: "Что смотреть",
      short: "Смотреть",
      icon: "sparkles",
    },
    { id: "feed", label: "Лента друзей", short: "Лента", icon: "activity" },
    { id: "search", label: "Искать", icon: "compass" },
    {
      id: "friends",
      label: "Друзья",
      icon: "users",
      badge: requestsCount,
    },
    { id: "profile", label: "Профиль", icon: "user-round" },
  ];

  const tabs = [
    { id: "all", label: "Все" },
    { id: "watched", label: "Просмотрено" },
    { id: "watchlist", label: "Буду смотреть" },
  ];

  return (
    <div className="min-h-app bg-[#0f1226] bg-[radial-gradient(ellipse_at_top_left,rgba(244,124,79,0.12),transparent_50%)] text-[#c9cce6]">
      <header className="sticky top-0 z-40 bg-[#131631]/95 backdrop-blur border-b border-white/5 safe-top safe-x">
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6 h-16">
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
            className="relative flex-1 min-w-0 max-w-xl flex gap-2"
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
                  searchMoviesDebounced(e.target.value);
                }}
                className="w-full min-w-0 bg-[#1c2040] border border-white/5 rounded-lg pl-10 pr-3 py-2.5 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60 focus:ring-1 focus:ring-[#f47c4f]/30 transition-all"
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

          {/* Распорка только на широких экранах: на телефоне всё место отдано поиску */}
          <div className="hidden sm:block flex-1" />

          <div className="relative flex items-center gap-3 shrink-0" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((open) => !open)}
              aria-label="Открыть меню аккаунта"
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              className="rounded-full outline-none ring-offset-2 ring-offset-[#131631] focus-visible:ring-2 focus-visible:ring-[#f47c4f]"
            >
              <Avatar name={user?.username} />
            </button>
            <div className="hidden sm:block leading-tight">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((open) => !open)}
                className="text-sm font-semibold text-white hover:text-[#f47c4f] transition-colors"
              >
                {user?.username}
              </button>
              <div className="text-xs text-[#8a90b8]">Мой аккаунт</div>
            </div>
            {avatarMenuOpen && (
              <div role="menu" aria-label="Меню аккаунта" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#171a33] p-2 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3 mb-1">
                  <Avatar name={user?.username} size="w-11 h-11" text="text-base" />
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{user?.username}</div>
                    <div className="text-xs text-[#8a90b8] truncate">{user?.email}</div>
                  </div>
                </div>
                <button role="menuitem" onClick={() => { setActiveTab("profile"); setAvatarMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#c9cce6] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="user-round" className="w-4 h-4" /> Профиль
                </button>
                <button role="menuitem" onClick={() => { setActiveTab("profile-settings"); setAvatarMenuOpen(false); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#c9cce6] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="settings" className="w-4 h-4" /> Настройки профиля
                </button>
                <a role="menuitem" href={`mailto:${CONTACT_EMAIL}`} onClick={() => setAvatarMenuOpen(false)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#c9cce6] hover:bg-white/[0.06] hover:text-white transition-colors">
                  <Icon n="life-buoy" className="w-4 h-4" /> Поддержка
                </a>
                <div className="my-1 border-t border-white/10" />
                <button role="menuitem" onClick={() => { setAvatarMenuOpen(false); logout(); }} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10 text-left transition-colors">
                  <Icon n="log-out" className="w-4 h-4" /> Выйти из аккаунта
                </button>
              </div>
            )}
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
                {item.badge > 0 && (
                  <span
                    className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#f47c4f] text-[#1a1020] text-[11px] font-bold flex items-center justify-center"
                    aria-label={`Новых заявок: ${item.badge}`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8">
          {activeTab === "home" && (
            <HomeFeed
              onOpenMovie={setSelectedMovie}
              onBrowse={() => setActiveTab("search")}
            />
          )}
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

              <MovieFilters
                filters={filters}
                onChange={setFilters}
                facets={facets}
                shownCount={filteredMovies.length}
                totalCount={byStatus.length}
                metaPending={metaPending}
              />

              {filteredMovies.length === 0 ? (
                isFiltering(filters) && byStatus.length > 0 ? (
                  <div className={`${PANEL} text-center py-14 px-6`}>
                    <p className="text-[#c9cce6] mb-4">
                      По этим условиям ничего не нашлось.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                      className={`px-5 py-2.5 rounded-lg text-sm ${BTN_SOFT}`}
                    >
                      Сбросить фильтры
                    </button>
                  </div>
                ) : (
                  <Empty text="Здесь пока пусто. Нажми «Новая запись» и добавь первый фильм." />
                )
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
                <h2 className="text-3xl font-semibold text-white">Открыть новое</h2>
                <p className="text-sm text-[#8a90b8]">Ищи по названию или подбери фильмы и сериалы по параметрам TMDB</p>
              </div>

              <section className="rounded-2xl border border-white/10 bg-[#171b37]/90 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Подбор по фильтрам</h3>
                    <p className="text-xs text-[#8a90b8]">Фильтры применяются к каталогу TMDB, а не только к загруженным карточкам</p>
                  </div>
                  <button type="button" onClick={() => setFiltersOpen((v) => !v)} className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:border-[#f47c4f]/60">
                    {filtersOpen ? "Свернуть" : "Показать фильтры"}
                  </button>
                </div>
                {filtersOpen && <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <label className="text-xs text-[#a5aacb] space-y-1.5">Тип контента
                      <select value={catalogType} onChange={(e) => { setCatalogType(e.target.value); setSelectedGenres([]); }} className="w-full rounded-lg bg-[#0f1226] border border-white/10 p-2.5 text-sm text-white">
                        <option value="movie">Фильмы</option><option value="tv">Сериалы</option>
                      </select>
                    </label>
                    <label className="text-xs text-[#a5aacb] space-y-1.5">Год от
                      <input type="number" min="1900" max="2026" placeholder="Например, 2000" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="w-full rounded-lg bg-[#0f1226] border border-white/10 p-2.5 text-sm text-white" />
                    </label>
                    <label className="text-xs text-[#a5aacb] space-y-1.5">Год до
                      <input type="number" min="1900" max="2026" placeholder="Например, 2026" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="w-full rounded-lg bg-[#0f1226] border border-white/10 p-2.5 text-sm text-white" />
                    </label>
                    <label className="text-xs text-[#a5aacb] space-y-1.5">Минимальный рейтинг
                      <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full rounded-lg bg-[#0f1226] border border-white/10 p-2.5 text-sm text-white">
                        <option value="0">Любой рейтинг</option><option value="5">От 5.0</option><option value="6">От 6.0</option><option value="7">От 7.0</option><option value="7.5">От 7.5</option><option value="8">От 8.0</option><option value="8.5">От 8.5</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-xs text-[#a5aacb] space-y-2">Жанры <span className="text-[#73799f]">(можно выбрать несколько)</span>
                    <div className="flex flex-wrap gap-2">
                      {catalogGenres.map((genre) => {
                        const active = selectedGenres.includes(genre.id);
                        return <button type="button" key={genre.id} onClick={() => setSelectedGenres((prev) => active ? prev.filter((id) => id !== genre.id) : [...prev, genre.id])} className={`rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-[#f47c4f] bg-[#f47c4f]/15 text-[#ff9b75]" : "border-white/10 bg-[#0f1226] text-[#a5aacb] hover:border-white/30"}`}>{genre.name}</button>;
                      })}
                    </div>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <label className="text-xs text-[#a5aacb] space-y-1.5 flex-1">Сортировка
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-lg bg-[#0f1226] border border-white/10 p-2.5 text-sm text-white">
                        <option value="popularity.desc">Сначала популярные</option><option value="vote_average.desc">По рейтингу</option><option value={catalogType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"}>Сначала новые</option><option value="vote_count.desc">По количеству оценок</option>
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { resetCatalogFilters(); }} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-[#a5aacb] hover:text-white">Сбросить</button>
                      <button type="button" disabled={catalogLoading} onClick={() => discoverMovies(1)} className="rounded-lg bg-[#f47c4f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ff9065] disabled:opacity-50">{catalogLoading ? "Ищем…" : "Подобрать"}</button>
                    </div>
                  </div>
                </>}
              </section>
              {catalogError && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{catalogError}</p>}
              {catalogLoading && <p className="py-4 text-center text-sm text-[#a5aacb]">Загружаем результаты из TMDB…</p>}

              {searchResults.length > 0 ? (
                <>
                  {!searchQuery.trim() && searchMode !== "filters" && (
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
                    catalogLoading
                      ? "Загружаем результаты…"
                      : searchMode === "filters"
                        ? "По этим фильтрам ничего не найдено. Попробуй изменить жанры или диапазон лет."
                        : searchQuery
                          ? "Ничего не найдено"
                          : "Введите название для поиска или используйте фильтры выше"
                  }
                />
              )}
              {searchMode === "filters" && searchResults.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button type="button" disabled={catalogPage <= 1 || catalogLoading} onClick={() => discoverMovies(catalogPage - 1)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40">← Назад</button>
                  <span className="text-sm text-[#8a90b8]">Страница {catalogPage} из {catalogTotalPages}</span>
                  <button type="button" disabled={catalogPage >= catalogTotalPages || catalogLoading} onClick={() => discoverMovies(catalogPage + 1)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40">Вперёд →</button>
                </div>
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
              <FriendsPanel
                onUserClick={setSelectedUserId}
                onRequestsChange={setRequestsCount}
              />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-5xl space-y-6">
              <div className={`${PANEL} relative overflow-hidden p-6 sm:p-8`}>
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-[#f47c4f]/25 via-[#8a4fff]/15 to-transparent pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-end gap-5">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] p-[3px] shadow-xl shadow-black/20">
                    {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full rounded-[13px] object-cover" /> : <div className="w-full h-full rounded-[13px] bg-[#171a33] flex items-center justify-center text-4xl font-bold text-white">{user?.username?.[0]?.toUpperCase() || "U"}</div>}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#f47c4f] font-semibold mb-2">Кинопрофиль</div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white truncate">{user?.username || "Киноман"}</h2>
                    <p className="text-sm text-[#8a90b8] mt-1">{user?.email}</p>
                  </div>
                  <button onClick={() => setActiveTab("profile-settings")} className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${BTN_SOFT}`}>
                    <Icon n="settings" className="w-4 h-4" /> Настройки профиля
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-7">
                  {[{ v: movies.length, l: "В журнале" }, { v: watchedCount, l: "Просмотрено" }, { v: friends.length, l: "Друзей" }].map((stat) => (
                    <div key={stat.l} className="rounded-xl bg-black/20 border border-white/5 p-4">
                      <div className="text-2xl sm:text-3xl font-bold text-white">{stat.v}</div>
                      <div className="text-xs text-[#8a90b8] mt-1">{stat.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <section className={`${PANEL} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-white">Витрина фильмов</h3>
                    <p className="text-sm text-[#8a90b8] mt-1">Три фильма, которые лучше всего тебя представляют.</p>
                  </div>
                  <button onClick={() => setActiveTab("profile-settings")} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${BTN_SOFT}`}>
                    <Icon n="settings-2" className="w-4 h-4" /> Настройки витрины
                  </button>
                </div>
                {showcaseMovieIds.map((id) => movies.find((movie) => String(movie.id) === id)).filter(Boolean).length ? (
                  <div className="grid grid-cols-3 gap-3 sm:gap-5">
                    {showcaseMovieIds.map((id) => movies.find((movie) => String(movie.id) === id)).filter(Boolean).map((movie) => (
                      <button key={movie.id} onClick={() => setSelectedMovie(movie)} className="group text-left min-w-0">
                        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#262b55] border border-white/10">
                          {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" /> : <div className="h-full flex items-center justify-center"><Icon n="film" className="w-8 h-8 opacity-40" /></div>}
                        </div>
                        <div className="text-sm font-semibold text-white mt-2 truncate">{movie.title}</div>
                        <div className="text-xs text-[#8a90b8]">{movie.year || "Из журнала"}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 text-center py-8 px-4">
                    <Icon n="clapperboard" className="w-8 h-8 mx-auto text-[#f47c4f] mb-2" />
                    <p className="text-sm text-[#c9cce6]">Витрина пока пуста</p>
                    <p className="text-xs text-[#8a90b8] mt-1">Нажми «Настройки витрины», чтобы выбрать до трёх фильмов.</p>
                  </div>
                )}
              </section>

              <section className={`${PANEL} p-5 sm:p-6`}>
                <button onClick={() => setProfileFriendsOpen((open) => !open)} className="w-full flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Icon n="users" className="w-5 h-5 text-sky-300" /></div>
                  <div className="flex-1"><h3 className="text-lg font-bold text-white">Друзья</h3><p className="text-xs text-[#8a90b8]">{friends.length} в твоём круге · нажми, чтобы {profileFriendsOpen ? "скрыть список" : "посмотреть список"}</p></div>
                  <Icon n={profileFriendsOpen ? "chevron-up" : "chevron-down"} className="w-5 h-5 text-[#8a90b8]" />
                </button>
                {profileFriendsOpen && <div className="mt-4 pt-4 border-t border-white/5">
                  {friends.length === 0 ? <p className="text-sm text-[#8a90b8] py-3">Пока друзей нет. Их можно найти во вкладке «Друзья».</p> : <div className="grid sm:grid-cols-2 gap-2">{friends.map((friend) => <button key={friend.id} onClick={() => setSelectedUserId(friend.id)} className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.03] hover:bg-white/[0.07] text-left transition-colors"><Avatar name={friend.username} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white truncate">{friend.username}</span><span className="block text-xs text-[#8a90b8]">Открыть профиль</span></span><Icon n="arrow-up-right" className="w-4 h-4 text-[#8a90b8]" /></button>)}</div>}
                  <button onClick={() => setActiveTab("friends")} className="mt-3 text-sm text-[#f47c4f] hover:text-[#ffad8d]">Управлять друзьями →</button>
                </div>}
              </section>
            </div>
          )}

          {activeTab === "profile-settings" && (
            <div className="max-w-2xl space-y-4 pb-28">
              <button onClick={() => setActiveTab("profile")} className="inline-flex items-center gap-2 text-sm text-[#8a90b8] hover:text-white"><Icon n="arrow-left" className="w-4 h-4" /> Назад в профиль</button>
              <div><h2 className="text-3xl font-semibold text-white">Настройки профиля</h2><p className="text-sm text-[#8a90b8] mt-1">Управление аккаунтом и данными журнала.</p></div>
              <div className={`${PANEL} p-5`}>
                <h3 className="flex items-center gap-2 text-lg text-white mb-1"><Icon n="user-round-pen" className="w-5 h-5" /> Личные данные</h3>
                <p className="text-sm text-[#8a90b8] mb-4">Измени никнейм и данные профиля.</p>
                <button onClick={() => setSelectedUserId(user?.id)} className={`w-full py-2.5 rounded-lg font-medium ${BTN_SOFT}`}>Редактировать профиль</button>
              </div>
              <div className={`${PANEL} p-5`}>
                <h3 className="flex items-center gap-2 text-lg text-white mb-1"><Icon n="clapperboard" className="w-5 h-5" /> Настройки витрины</h3>
                <p className="text-sm text-[#8a90b8] mb-4">Выбери до трёх фильмов из журнала. Изменения будут видны в твоём профиле и профиле друзей.</p>
                {movies.length ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {movies.map((movie) => {
                    const selected = showcaseMovieIds.includes(String(movie.id));
                    const disabled = !selected && showcaseMovieIds.length >= 3;
                    return <button key={movie.id} disabled={disabled} onClick={() => toggleShowcaseMovie(movie)} className={`text-left rounded-xl border p-2 transition ${selected ? "border-[#f47c4f] bg-[#f47c4f]/10" : "border-white/10 bg-black/10 hover:bg-white/5"} disabled:opacity-40`}>
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#262b55]">
                        {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center"><Icon n="film" /></div>}
                        {selected && <span className="absolute top-2 right-2 bg-[#f47c4f] rounded-full p-1"><Icon n="check" className="w-3 h-3" /></span>}
                      </div>
                      <div className="text-xs font-semibold text-white mt-2 line-clamp-2">{movie.title}</div>
                    </button>;
                  })}
                </div> : <p className="text-sm text-[#8a90b8]">Сначала добавь фильмы в журнал.</p>}
                {showcaseSaveError && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{showcaseSaveError}</p>}
              </div>
              <div className={`${PANEL} p-5`}>
                <h3 className="flex items-center gap-2 text-lg text-white mb-1"><Icon n="download" className="w-5 h-5" /> Импорт из файла</h3>
                <p className="text-sm text-[#8a90b8] mb-4">Загрузите .txt или .docx файл со списком фильмов</p>
                <label className={`block w-full text-center py-2.5 rounded-lg cursor-pointer ${importing ? "bg-[#262b55] text-[#8a90b8] cursor-not-allowed" : BTN_ORANGE}`}>
                  {importing ? `Импорт... ${importProgress.current}/${importProgress.total}` : "Выбрать файл"}
                  <input type="file" accept=".txt,.docx" onChange={handleDocxImport} disabled={importing} className="hidden" />
                </label>
              </div>
              <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-white/10 bg-[#171a36]/95 p-3 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">Витрина фильмов</p>
                    <p className="text-xs text-[#a2a7c8]">Выбрано {showcaseMovieIds.length} из 3</p>
                  </div>
                  <button
                    disabled={savingShowcase || !token}
                    onClick={async () => {
                      setSavingShowcase(true);
                      setShowcaseSaveError("");
                      const selectedIds = showcaseMovieIds.slice(0, 3);
                      try {
                        const response = await fetch(`${API_URL}/api/users/profile`, {
                          method: "PUT",
                          headers: authHeaders,
                          body: JSON.stringify({ showcaseMovieIds: selectedIds }),
                        });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) throw new Error(data.error || `Не удалось сохранить витрину (${response.status})`);
                        if (data.user && Array.isArray(data.user.showcaseMovieIds)) {
                          setShowcaseMovieIds(data.user.showcaseMovieIds.slice(0, 3));
                        }
                        try { localStorage.setItem(`movieShowcase:${user.id}`, JSON.stringify(selectedIds)); } catch {}
                        setActiveTab("profile");
                      } catch (error) {
                        const message = error instanceof TypeError
                          ? "Не удалось подключиться к серверу. Проверь, что backend запущен на порту 3001, и попробуй ещё раз."
                          : (error.message || "Не удалось сохранить витрину");
                        setShowcaseSaveError(message);
                      } finally {
                        setSavingShowcase(false);
                      }
                    }}
                    className={`shrink-0 rounded-xl px-5 py-3 font-semibold ${BTN_ORANGE} disabled:cursor-not-allowed disabled:opacity-50`}
                  >{savingShowcase ? "Сохранение…" : "Сохранить витрину"}</button>
                </div>
              </div>
              <div className={`${PANEL} p-5`}>
                <h3 className="text-lg font-semibold text-white mb-1">Сессия</h3><p className="text-sm text-[#8a90b8] mb-4">Выйти из текущего аккаунта на этом устройстве.</p>
                <button onClick={logout} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium ${BTN_RED}`}><Icon n="log-out" /> Выйти из аккаунта</button>
              </div>
            </div>
          )}
          <Footer className="mt-12" />
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

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#131631] border-t border-white/5 flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] safe-x">
        {navItems.filter((item) => item.id !== "profile").map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1 py-1"
          >
            <span className="relative">
              <Icon
                n={item.icon}
                className={`w-5 h-5 ${activeTab === item.id ? ORANGE_FILTER : "opacity-60"}`}
              />
              {item.badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#f47c4f] text-[#1a1020] text-[10px] font-bold leading-none flex items-center justify-center"
                  aria-label={`Новых заявок: ${item.badge}`}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </span>
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
          onUserClick={(id) => setSelectedUserId(id)}
        />
      )}

      {selectedMovie && (
        <MovieDetailsModal
          key={`${selectedMovie.media_type || "movie"}-${selectedMovie.id}`}
          movie={selectedMovie}
          existing={movies.find(
            (m) =>
              m.tmdbId === selectedMovie.id &&
              m.mediaType === (selectedMovie.media_type === "tv" ? "tv" : "movie"),
          )}
          onClose={() => setSelectedMovie(null)}
          onOpenReview={setReviewMovieId}
          onAdd={(status, details) =>
            addMovie({
              tmdbId: selectedMovie.id,
              title: selectedMovie.title || selectedMovie.name,
              posterUrl: selectedMovie.poster_path
                ? `${POSTER}${selectedMovie.poster_path}`
                : null,
              status,
              mediaType: selectedMovie.media_type === "tv" ? "tv" : "movie",
              ...metaFromTmdb(details || selectedMovie),
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
  const hash = useHashRoute();
  // Политика открывается и без входа, и по прямой ссылке
  if (hash === POLICY_HASH) return <PrivacyPolicy />;
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
