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
import { Chip, MovieCard, Grid, Empty, Avatar, Logo, Poster } from "./components/ui";
import {
  ORANGE_FILTER,
  BTN_ORANGE,
  BTN_SOFT,
  BTN_RED,
  PANEL,
  DARK_ICON,
  EYEBROW,
  PAGE_TITLE,
  SECTION_TITLE,
} from "./components/styles";
import { API_URL, TMDB_API_KEY, TMDB, POSTER } from "./config";

function MovieTracker() {
  const [friendsLastWatched, setFriendsLastWatched] = useState({});
  const { user, token, logout, getFriends, getFriendRequests, updateAvatar } = useAuth();
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
  // На телефоне фильтры свёрнуты, чтобы сразу были видны результаты поиска
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return window.matchMedia("(min-width: 1024px)").matches;
    } catch {
      return true;
    }
  });
  const [searchMode, setSearchMode] = useState("text");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showcaseMovieIds, setShowcaseMovieIds] = useState([]);
  const [showcaseLoaded, setShowcaseLoaded] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [showcaseSaveError, setShowcaseSaveError] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef(null);
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

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAvatarMessage("");
    setAvatarError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Выбери файл изображения.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("Файл слишком большой. Максимальный размер исходного изображения — 10 МБ.");
      return;
    }

    setAvatarSaving(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const maxSide = 512;
          const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) return reject(new Error("Не удалось обработать изображение."));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          let quality = 0.86;
          let result = canvas.toDataURL("image/webp", quality);
          while (result.length > 450_000 && quality > 0.4) {
            quality -= 0.1;
            result = canvas.toDataURL("image/webp", quality);
          }
          if (result.length > 500_000) return reject(new Error("Изображение не удалось сжать до нужного размера. Выбери другое."));
          resolve(result);
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Не удалось открыть это изображение."));
        };
        image.src = objectUrl;
      });
      const result = await updateAvatar(dataUrl);
      if (!result.success) throw new Error(result.error || "Не удалось сохранить аватар.");
      setAvatarMessage("Аватар успешно обновлён.");
    } catch (error) {
      setAvatarError(error.message || "Не удалось обновить аватар.");
    } finally {
      setAvatarSaving(false);
    }
  };


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
    { id: "movies", label: "Мой список", short: "Список", icon: "layout-dashboard" },
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

  const statItems = [
    { v: movies.length, l: "Всего", c: "text-white" },
    { v: watchedCount, l: "Смотрел", c: "text-[#58dcaa]" },
    { v: watchlistCount, l: "В планах", c: "text-[#86b8ff]" },
  ];

  return (
    <div className="min-h-app bg-[#0a0c18] text-[#c4c8e4]">
      <div className="flex">
        <aside className="hidden lg:flex w-64 shrink-0 sticky top-0 h-[100dvh] flex-col gap-6 overflow-y-auto border-r border-white/[0.06] bg-[#0d1021] px-[18px] py-6">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className="px-1.5 text-left"
            aria-label="На главную"
          >
            <Logo />
          </button>

          <div className={`${PANEL} p-4 space-y-3.5`}>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className="w-full flex items-center gap-3 text-left"
            >
              <Avatar name={user?.username} avatar={user?.avatar} size="w-12 h-12" text="text-lg" />
              <span className="min-w-0">
                <span className="block font-extrabold text-white truncate">{user?.username}</span>
                <span className="block text-xs text-[#8b91b5] truncate">{user?.email}</span>
              </span>
            </button>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {statItems.map((s) => (
                <div key={s.l}>
                  <div className={`font-display text-lg font-semibold ${s.c}`}>{s.v}</div>
                  <div className="text-[11px] text-[#8b91b5] mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <nav className="space-y-1" aria-label="Разделы">
            {navItems.map((item) => {
              const active =
                activeTab === item.id ||
                (item.id === "profile" && activeTab === "profile-settings");
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#ff7a45]/[0.14] text-[#ff935f]"
                      : "text-[#9aa0c6] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    n={item.icon}
                    className={`w-[18px] h-[18px] ${active ? ORANGE_FILTER : "opacity-70"}`}
                  />
                  {item.label}
                  {item.badge > 0 && (
                    <span
                      className="ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-xs font-extrabold flex items-center justify-center"
                      aria-label={`Новых заявок: ${item.badge}`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
      <header className="sticky top-0 z-40 bg-[#0a0c18]/90 backdrop-blur-xl border-b border-white/[0.06] safe-top safe-x">
        <div className="flex items-center gap-2.5 sm:gap-3 px-4 lg:px-8 h-[72px]">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className="lg:hidden shrink-0"
            aria-label="На главную"
          >
            <Logo showText={false} />
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault(); // Предотвращаем перезагрузку страницы при нажатии Enter/Поиск
              if (activeTab !== "search") setActiveTab("search");
              searchMovies(searchQuery); // Явно запускаем поиск по текущему значению
            }}
            className="relative flex-1 min-w-0 max-w-xl flex gap-2"
          >
            <div className="relative flex-1 min-w-0">
              <Icon
                n="search"
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${activeTab === "search" && searchQuery ? ORANGE_FILTER : "opacity-50"}`}
              />
              <input
                type="search" /* показывает кнопку с лупой на клавиатуре телефона */
                inputMode="search"
                autoComplete="off"
                placeholder="Поиск фильмов и сериалов"
                aria-label="Поиск фильмов и сериалов"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== "search") setActiveTab("search");
                  searchMoviesDebounced(e.target.value);
                }}
                className="w-full min-w-0 h-12 bg-[#12152a] border border-white/[0.08] rounded-2xl pl-11 pr-3 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition"
              />
            </div>

            <button
              type="submit"
              aria-label="Найти"
              className={`h-12 px-3.5 sm:px-5 rounded-2xl text-sm flex items-center gap-2 shrink-0 active:scale-95 ${BTN_ORANGE}`}
            >
              <Icon n="search" className={`w-5 h-5 sm:hidden ${DARK_ICON}`} />
              <span className="hidden sm:inline">Найти</span>
            </button>
          </form>

          <div className="hidden sm:block flex-1" />

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`hidden md:inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm ${BTN_SOFT}`}
          >
            <Icon n="plus" className="w-4 h-4" /> Новая запись
          </button>

          <div className="relative flex items-center shrink-0" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((open) => !open)}
              aria-label="Открыть меню аккаунта"
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              className="relative rounded-full outline-none ring-offset-2 ring-offset-[#0a0c18] focus-visible:ring-2 focus-visible:ring-[#ff7a45]"
            >
              <Avatar name={user?.username} avatar={user?.avatar} size="w-11 h-11" />
              {requestsCount > 0 && (
                <span className="lg:hidden absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#ff7a45] border-2 border-[#0a0c18]" />
              )}
            </button>
            {avatarMenuOpen && (
              <div role="menu" aria-label="Меню аккаунта" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#12152a] p-2 shadow-2xl shadow-black/50">
                <div className="flex items-center gap-3 border-b border-white/[0.08] px-3 py-3 mb-1">
                  <Avatar name={user?.username} avatar={user?.avatar} size="w-11 h-11" text="text-base" />
                  <div className="min-w-0">
                    <div className="font-extrabold text-white truncate">{user?.username}</div>
                    <div className="text-xs text-[#8b91b5] truncate">{user?.email}</div>
                  </div>
                </div>
                <button role="menuitem" onClick={() => { setActiveTab("profile"); setAvatarMenuOpen(false); }} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#c4c8e4] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="user-round" className="w-4 h-4" /> Профиль
                </button>
                <button role="menuitem" onClick={() => { setActiveTab("friends"); setAvatarMenuOpen(false); }} className="lg:hidden w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#c4c8e4] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="users" className="w-4 h-4" /> Друзья
                  {requestsCount > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center">{requestsCount}</span>}
                </button>
                <button role="menuitem" onClick={() => { setActiveTab("profile-settings"); setAvatarMenuOpen(false); }} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#c4c8e4] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="settings" className="w-4 h-4" /> Настройки профиля
                </button>
                <a role="menuitem" href={`mailto:${CONTACT_EMAIL}`} onClick={() => setAvatarMenuOpen(false)} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#c4c8e4] hover:bg-white/[0.06] hover:text-white transition-colors">
                  <Icon n="life-buoy" className="w-4 h-4" /> Поддержка
                </a>
                <div className="my-1 border-t border-white/[0.08]" />
                <button role="menuitem" onClick={() => { setAvatarMenuOpen(false); logout(); }} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 text-left transition-colors">
                  <Icon n="log-out" className="w-4 h-4" /> Выйти из аккаунта
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 lg:py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10">
          {activeTab === "home" && (
            <HomeFeed
              onOpenMovie={setSelectedMovie}
              onBrowse={() => setActiveTab("search")}
            />
          )}
          {activeTab === "movies" && (
            <div className="space-y-6">
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <div className={`${EYEBROW} mb-2.5`}>Мой список</div>
                  <h1 className={PAGE_TITLE}>Журнал {user?.username}</h1>
                </div>
                <div className="flex gap-2.5">
                  <label
                    className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm cursor-pointer ${BTN_SOFT} ${importing ? "opacity-50 pointer-events-none" : ""}`}
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
                    className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm ${BTN_ORANGE}`}
                  >
                    <Icon n="plus" className={`w-4 h-4 ${DARK_ICON}`} />
                    Новая запись
                  </button>
                </div>
              </div>

              {importing && (
                <div className={`${PANEL} p-4`}>
                  <div className="flex justify-between text-sm mb-2.5">
                    <span className="font-bold text-white">Импорт фильмов</span>
                    <span className="text-[#8b91b5]">{importProgress.current} из {importProgress.total}</span>
                  </div>
                  <div className="h-2 bg-[#0a0c18] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff7a45] rounded-full transition-all"
                      style={{
                        width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-white/[0.07]">
                <div className="no-scrollbar flex gap-6 overflow-x-auto">
                {tabs.map((t) => {
                  const count = t.id === "watched" ? watchedCount : t.id === "watchlist" ? watchlistCount : movies.length;
                  return (
                  <button
                    key={t.id}
                    onClick={() => setMovieFilter(t.id)}
                    aria-pressed={movieFilter === t.id}
                    className={`shrink-0 inline-flex items-center gap-2 py-3.5 -mb-px text-sm font-bold border-b-2 transition-colors ${
                      movieFilter === t.id
                        ? "text-[#ff935f] border-[#ff7a45]"
                        : "text-[#8b91b5] border-transparent hover:text-white"
                    }`}
                  >
                    {t.label}
                    <span className="text-xs px-2 py-px rounded-full bg-white/[0.07] text-[#aeb3d6]">{count}</span>
                  </button>
                  );
                })}
                </div>
                <label className="flex items-center gap-2.5 pb-2 text-[13px] text-[#8b91b5]">
                  Сортировка
                  <select
                    value={sortMode}
                    onChange={(e) => changeSort(e.target.value)}
                    className="h-10 bg-[#12152a] border border-white/[0.08] rounded-xl px-3 text-sm font-semibold text-white focus:outline-none focus:border-[#ff7a45]"
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
                    <p className="text-[#c4c8e4] mb-4">
                      По этим условиям ничего не нашлось.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                      className={`h-11 px-5 rounded-xl text-sm ${BTN_SOFT}`}
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
                            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] ${BTN_SOFT}`}
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
                            className={`px-2 rounded-lg ${BTN_RED}`}
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
            <div className="space-y-6">
              <div>
                <div className={`${EYEBROW} mb-2.5`}>Каталог TMDB</div>
                <h1 className={PAGE_TITLE}>Открыть новое</h1>
                <p className="mt-2.5 text-sm text-[#8b91b5]">Ищи по названию или подбери фильмы и сериалы по параметрам</p>
              </div>

              <section className={`${PANEL} p-4 sm:p-6 space-y-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={SECTION_TITLE}>Подбор по фильтрам</h2>
                    <p className="mt-1.5 text-[13px] text-[#8b91b5]">Фильтры применяются ко всему каталогу TMDB, а не только к загруженным карточкам</p>
                  </div>
                  <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`h-10 px-4 rounded-xl text-sm ${BTN_SOFT}`}>
                    {filtersOpen ? "Свернуть" : "Показать фильтры"}
                  </button>
                </div>
                {filtersOpen && <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    <div className="text-xs font-bold text-[#aeb3d6] space-y-2">
                      <span className="block">Тип контента</span>
                      <div className="flex gap-1 p-[3px] rounded-xl bg-[#0d1021] border border-white/[0.08]" role="group" aria-label="Тип контента">
                        {[{ v: "movie", l: "Фильмы" }, { v: "tv", l: "Сериалы" }].map((o) => (
                          <button key={o.v} type="button" aria-pressed={catalogType === o.v} onClick={() => { setCatalogType(o.v); setSelectedGenres([]); }} className={`flex-1 h-9 rounded-[9px] text-[13px] font-bold transition-colors ${catalogType === o.v ? "bg-[#1d2140] text-white" : "text-[#8b91b5] hover:text-white"}`}>{o.l}</button>
                        ))}
                      </div>
                    </div>
                    <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Год от
                      <input type="number" min="1900" max="2026" placeholder="Например, 2000" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="w-full h-11 rounded-xl bg-[#0d1021] border border-white/[0.09] px-3.5 text-sm font-medium text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45]" />
                    </label>
                    <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Год до
                      <input type="number" min="1900" max="2026" placeholder="Например, 2026" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="w-full h-11 rounded-xl bg-[#0d1021] border border-white/[0.09] px-3.5 text-sm font-medium text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45]" />
                    </label>
                    <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Минимальный рейтинг
                      <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full h-11 rounded-xl bg-[#0d1021] border border-white/[0.09] px-3 text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]">
                        <option value="0">Любой рейтинг</option><option value="5">От 5.0</option><option value="6">От 6.0</option><option value="7">От 7.0</option><option value="7.5">От 7.5</option><option value="8">От 8.0</option><option value="8.5">От 8.5</option>
                      </select>
                    </label>
                  </div>
                  <div className="text-xs font-bold text-[#aeb3d6] space-y-2.5">
                    <span className="block">Жанры <span className="font-medium text-[#6f759e]">можно выбрать несколько</span></span>
                    <div className="flex flex-wrap gap-2">
                      {catalogGenres.map((genre) => {
                        const active = selectedGenres.includes(genre.id);
                        return <button type="button" key={genre.id} aria-pressed={active} onClick={() => setSelectedGenres((prev) => active ? prev.filter((id) => id !== genre.id) : [...prev, genre.id])} className={`min-h-[38px] rounded-full border px-4 text-[13px] font-bold transition ${active ? "border-[#ff7a45] bg-[#ff7a45]/15 text-[#ffa27d]" : "border-white/10 bg-[#0d1021] text-[#aeb3d6] hover:border-white/30"}`}>{genre.name}</button>;
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <label className="text-xs font-bold text-[#aeb3d6] space-y-2 flex-1 block">Сортировка
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full h-11 rounded-xl bg-[#0d1021] border border-white/[0.09] px-3 text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]">
                        <option value="popularity.desc">Сначала популярные</option><option value="vote_average.desc">По рейтингу</option><option value={catalogType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"}>Сначала новые</option><option value="vote_count.desc">По количеству оценок</option>
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { resetCatalogFilters(); }} className={`flex-1 sm:flex-none h-11 px-5 rounded-xl text-sm ${BTN_SOFT}`}>Сбросить</button>
                      <button type="button" disabled={catalogLoading} onClick={() => discoverMovies(1)} className={`flex-1 sm:flex-none h-11 px-6 rounded-xl text-sm disabled:opacity-50 ${BTN_ORANGE}`}>{catalogLoading ? "Ищем…" : "Подобрать"}</button>
                    </div>
                  </div>
                </>}
              </section>
              {catalogError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{catalogError}</p>}
              {catalogLoading && <p className="py-4 text-center text-sm text-[#aeb3d6]">Загружаем результаты из TMDB…</p>}

              {searchResults.length > 0 ? (
                <>
                  {!searchQuery.trim() && searchMode !== "filters" && (
                    <h2 className={`flex items-center gap-2.5 ${SECTION_TITLE}`}>
                      <Icon n="flame" className={`w-5 h-5 ${ORANGE_FILTER}`} />
                      Сейчас популярно
                    </h2>
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
                                className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] ${BTN_RED}`}
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
                  <button type="button" disabled={catalogPage <= 1 || catalogLoading} onClick={() => discoverMovies(catalogPage - 1)} className={`h-11 px-5 rounded-xl text-sm disabled:opacity-40 ${BTN_SOFT}`}>← Назад</button>
                  <span className="text-sm text-[#8b91b5]">Страница {catalogPage} из {catalogTotalPages}</span>
                  <button type="button" disabled={catalogPage >= catalogTotalPages || catalogLoading} onClick={() => discoverMovies(catalogPage + 1)} className={`h-11 px-5 rounded-xl text-sm disabled:opacity-40 ${BTN_SOFT}`}>Вперёд →</button>
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
              <div className={`${EYEBROW} mb-2.5`}>Люди</div>
              <h1 className={`${PAGE_TITLE} mb-7`}>Сообщество</h1>
              <FriendsPanel
                onUserClick={setSelectedUserId}
                onRequestsChange={setRequestsCount}
              />
            </div>
          )}

          {activeTab === "profile" && (
            <div className="max-w-5xl space-y-6">
              <div className={`${PANEL} relative overflow-hidden`}>
                <div className="h-28 sm:h-36 mg-glow-banner bg-[#161a35]" />
                <div className="relative px-5 sm:px-8 -mt-12 flex flex-col sm:flex-row sm:items-end gap-5">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-[#ff7a45] to-[#8b5cf6] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
                      {user?.avatar ? <img src={user.avatar} alt="Аватар профиля" className="w-full h-full rounded-[24px] object-cover" /> : <div className="w-full h-full rounded-[24px] bg-[#12152a] flex items-center justify-center font-display text-[44px] font-bold text-white">{user?.username?.[0]?.toUpperCase() || "U"}</div>}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      aria-label="Выбрать фотографию профиля"
                    />
                    <button type="button" disabled={avatarSaving} onClick={() => { setAvatarMessage(""); setAvatarError(""); avatarInputRef.current?.click(); }} className={`text-xs h-9 px-3.5 rounded-xl ${BTN_SOFT} disabled:opacity-50`}>
                      {avatarSaving ? "Сохранение…" : "Изменить фото"}
                    </button>
                    {avatarMessage && <p role="status" className="text-xs text-emerald-300">{avatarMessage}</p>}
                    {avatarError && <p role="alert" className="max-w-[180px] text-xs text-red-300 text-center">{avatarError}</p>}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className={`${EYEBROW} mb-2`}>Кинопрофиль</div>
                    <h1 className="font-display text-[28px] sm:text-[34px] font-bold text-white truncate">{user?.username || "Киноман"}</h1>
                    <p className="text-sm text-[#8b91b5] mt-1">{user?.email}</p>
                  </div>
                  <button onClick={() => setActiveTab("profile-settings")} className={`inline-flex items-center justify-center gap-2 h-11 px-4 mb-1 rounded-xl text-sm ${BTN_SOFT}`}>
                    <Icon n="settings" className="w-4 h-4" /> Настройки профиля
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 p-5 sm:p-8 pt-6 sm:pt-7">
                  {[{ v: movies.length, l: "В журнале", c: "text-white" }, { v: watchedCount, l: "Просмотрено", c: "text-[#58dcaa]" }, { v: friends.length, l: "Друзей", c: "text-[#86b8ff]" }].map((stat) => (
                    <div key={stat.l} className="rounded-2xl bg-[#080a16]/50 border border-white/[0.06] p-4 sm:px-5">
                      <div className={`font-display text-2xl sm:text-[30px] font-bold ${stat.c}`}>{stat.v}</div>
                      <div className="text-xs text-[#8b91b5] mt-1">{stat.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <section className={`${PANEL} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className={SECTION_TITLE}>Витрина фильмов</h2>
                    <p className="text-sm text-[#8b91b5] mt-1">Три фильма, которые лучше всего тебя представляют.</p>
                  </div>
                  <button onClick={() => setActiveTab("profile-settings")} className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm ${BTN_SOFT}`}>
                    <Icon n="settings-2" className="w-4 h-4" /> Настройки витрины
                  </button>
                </div>
                {showcaseMovieIds.map((id) => movies.find((movie) => String(movie.id) === id)).filter(Boolean).length ? (
                  <div className="grid grid-cols-3 gap-3 sm:gap-5">
                    {showcaseMovieIds.map((id) => movies.find((movie) => String(movie.id) === id)).filter(Boolean).map((movie) => (
                      <button key={movie.id} onClick={() => setReviewMovieId(movie.id)} className="group text-left min-w-0">
                        <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-[#1d2140] border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.4)] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#ff7a45]/50">
                          <Poster src={movie.posterUrl} title={movie.title} className="transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <div className="text-sm font-extrabold text-white mt-3 truncate">{movie.title}</div>
                        <div className="text-xs text-[#8b91b5] mt-0.5">{movie.year || "Из журнала"}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border-[1.5px] border-dashed border-white/[0.12] text-center py-10 px-4">
                    <Icon n="clapperboard" className={`w-8 h-8 mx-auto mb-3 ${ORANGE_FILTER}`} />
                    <p className="text-sm text-[#c9cce6]">Витрина пока пуста</p>
                    <p className="text-xs text-[#8b91b5] mt-1">Нажми «Настройки витрины», чтобы выбрать до трёх фильмов.</p>
                  </div>
                )}
              </section>

              <section className={`${PANEL} p-5 sm:p-6`}>
                <button onClick={() => setProfileFriendsOpen((open) => !open)} className="w-full flex items-center gap-3 text-left">
                  <div className="w-11 h-11 rounded-[14px] bg-sky-400/[0.14] flex items-center justify-center shrink-0"><Icon n="users" className="w-5 h-5 [filter:invert(1)_sepia(1)_saturate(4)_hue-rotate(180deg)]" /></div>
                  <div className="flex-1"><h2 className={SECTION_TITLE}>Друзья</h2><p className="text-xs text-[#8b91b5] mt-1">{friends.length} в твоём круге · нажми, чтобы {profileFriendsOpen ? "скрыть список" : "посмотреть список"}</p></div>
                  <Icon n={profileFriendsOpen ? "chevron-up" : "chevron-down"} className="w-5 h-5 text-[#8b91b5]" />
                </button>
                {profileFriendsOpen && <div className="mt-4 pt-4 border-t border-white/5">
                  {friends.length === 0 ? <p className="text-sm text-[#8b91b5] py-3">Пока друзей нет. Их можно найти во вкладке «Друзья».</p> : <div className="grid sm:grid-cols-2 gap-2">{friends.map((friend) => <button key={friend.id} onClick={() => setSelectedUserId(friend.id)} className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.03] hover:bg-white/[0.07] text-left transition-colors"><Avatar name={friend.username} avatar={friend.avatar} /><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-white truncate">{friend.username}</span><span className="block text-xs text-[#8b91b5]">Открыть профиль</span></span><Icon n="arrow-up-right" className="w-4 h-4 text-[#8b91b5]" /></button>)}</div>}
                  <button onClick={() => setActiveTab("friends")} className="mt-4 text-sm font-bold text-[#ff935f] hover:text-[#ffa27d]">Управлять друзьями →</button>
                </div>}
              </section>
            </div>
          )}

          {activeTab === "profile-settings" && (
            <div className="max-w-3xl space-y-5 pb-28">
              <button onClick={() => setActiveTab("profile")} className="inline-flex items-center gap-2 min-h-[44px] text-sm font-bold text-[#8b91b5] hover:text-white"><Icon n="arrow-left" className="w-4 h-4" /> Назад в профиль</button>
              <div><h1 className={PAGE_TITLE}>Настройки профиля</h1><p className="text-sm text-[#8b91b5] mt-2.5">Управление аккаунтом и данными журнала.</p></div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="image" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Аватар профиля</h2>
                <p className="text-sm text-[#8b91b5] mb-5 leading-relaxed">Загрузи изображение с устройства. Оно будет автоматически обрезано по размеру и сжато.</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-[88px] h-[88px] shrink-0 rounded-3xl overflow-hidden bg-gradient-to-br from-[#ff7a45] to-[#8b5cf6] flex items-center justify-center">
                    {user?.avatar ? <img src={user.avatar} alt="Текущий аватар" className="w-full h-full object-cover" /> : <span className="font-display text-4xl font-bold text-white">{user?.username?.[0]?.toUpperCase() || "U"}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <button type="button" disabled={avatarSaving} onClick={() => avatarInputRef.current?.click()} className={`h-11 px-5 rounded-xl text-sm disabled:opacity-50 ${BTN_ORANGE}`}>
                      {avatarSaving ? "Сохранение…" : "Выбрать изображение"}
                    </button>
                    {user?.avatar && <button type="button" disabled={avatarSaving} onClick={async () => {
                      setAvatarSaving(true); setAvatarMessage(""); setAvatarError("");
                      try {
                        const result = await updateAvatar(null);
                        if (!result.success) throw new Error(result.error || "Не удалось удалить аватар.");
                        setAvatarMessage("Аватар удалён.");
                      } catch (error) { setAvatarError(error.message || "Не удалось удалить аватар."); }
                      finally { setAvatarSaving(false); }
                    }} className={`h-11 px-5 rounded-xl text-sm ${BTN_SOFT} disabled:opacity-50`}>Удалить аватар</button>}
                  </div>
                </div>
                {avatarMessage && <p role="status" className="mt-3 text-sm text-emerald-300">{avatarMessage}</p>}
                {avatarError && <p role="alert" className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{avatarError}</p>}
                <p className="text-xs text-[#8b91b5] mt-3">Поддерживаются изображения JPG, PNG, WebP и другие форматы, которые открывает браузер. Исходный файл — до 10 МБ.</p>
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="user-round-pen" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Личные данные</h2>
                <p className="text-sm text-[#8b91b5] mb-4">Измени никнейм и данные профиля.</p>
                <button onClick={() => setSelectedUserId(user?.id)} className={`w-full h-11 rounded-xl text-sm ${BTN_SOFT}`}>Редактировать профиль</button>
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="clapperboard" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Настройки витрины</h2>
                <p className="text-sm text-[#8b91b5] mb-4">Выбери до трёх фильмов из журнала. Изменения будут видны в твоём профиле и профиле друзей.</p>
                {movies.length ? <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {movies.map((movie) => {
                    const selected = showcaseMovieIds.includes(String(movie.id));
                    const disabled = !selected && showcaseMovieIds.length >= 3;
                    return <button key={movie.id} disabled={disabled} onClick={() => toggleShowcaseMovie(movie)} aria-pressed={selected} className={`text-left rounded-2xl border p-2 transition ${selected ? "border-[#ff7a45] bg-[#ff7a45]/[0.09]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/5"} disabled:opacity-40`}>
                      <div className="relative aspect-[2/3] rounded-[10px] overflow-hidden bg-[#1d2140]">
                        <Poster src={movie.posterUrl} title={movie.title} />
                        {selected && <span className="absolute top-2 right-2 w-7 h-7 bg-[#ff7a45] rounded-full flex items-center justify-center"><Icon n="check" className={`w-3.5 h-3.5 ${DARK_ICON}`} /></span>}
                      </div>
                      <div className="text-xs font-extrabold text-white mt-2.5 px-0.5 line-clamp-2">{movie.title}</div>
                    </button>;
                  })}
                </div> : <p className="text-sm text-[#8b91b5]">Сначала добавь фильмы в журнал.</p>}
                {showcaseSaveError && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{showcaseSaveError}</p>}
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="download" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Импорт из файла</h2>
                <p className="text-sm text-[#8b91b5] mb-5 leading-relaxed">Загрузите .txt или .docx файл со списком фильмов. Каждая строка — название и, если хотите, оценка в конце.</p>
                <div className="rounded-2xl border-[1.5px] border-dashed border-white/[0.16] p-6 sm:p-7 flex flex-col items-center gap-3 text-center">
                  <Icon n="file-up" className={`w-7 h-7 ${ORANGE_FILTER}`} />
                  <label className={`inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm cursor-pointer ${importing ? "bg-[#1d2140] text-[#8b91b5] cursor-not-allowed font-bold" : BTN_ORANGE}`}>
                    {importing ? `Импорт... ${importProgress.current}/${importProgress.total}` : "Выбрать файл"}
                    <input type="file" accept=".txt,.docx" onChange={handleDocxImport} disabled={importing} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bottom-6 z-30 rounded-[18px] border border-white/10 bg-[#14172e]/95 p-3 pl-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-3.5 sm:pl-6">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-white">Витрина фильмов</p>
                    <p className="text-xs text-[#aeb3d6]">Выбрано {showcaseMovieIds.length} из 3</p>
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
                    className={`shrink-0 h-11 rounded-xl px-5 text-sm ${BTN_ORANGE} disabled:cursor-not-allowed disabled:opacity-50`}
                  >{savingShowcase ? "Сохранение…" : "Сохранить витрину"}</button>
                </div>
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`${SECTION_TITLE} mb-2`}>Сессия</h2><p className="text-sm text-[#8b91b5] mb-5">Выйти из текущего аккаунта на этом устройстве.</p>
                <button onClick={logout} className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm ${BTN_RED}`}><Icon n="log-out" /> Выйти из аккаунта</button>
              </div>
            </div>
          )}
          <Footer className="mt-12" />
        </main>

        {["home", "movies", "feed"].includes(activeTab) && (
        <aside className="hidden xl:flex w-[300px] shrink-0 sticky top-[72px] h-[calc(100dvh-72px)] flex-col gap-4 overflow-y-auto py-8 pr-8">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-white">Друзья</h3>
            <button onClick={() => setActiveTab("friends")} className="text-[13px] font-bold text-[#ff935f] hover:text-[#ffb08a]">
              Все
            </button>
          </div>

          {friends.length === 0 ? (
            <p className={`${PANEL} text-sm text-[#8b91b5] text-center py-6 px-4`}>
              Пока никого. Найди друзей во вкладке «Друзья».
            </p>
          ) : (
            friends.map((f) => {
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

              const lastMovie = lastWatchedData[f.id];

              return (
                <button
                  key={f.id}
                  onClick={() => f.id && setSelectedUserId(f.id)}
                  className={`${PANEL} w-full flex items-start gap-3 p-3.5 text-left transition-colors hover:border-[#ff7a45]/40 group`}
                >
                  <div className="relative shrink-0">
                    <Avatar name={f.username} avatar={f.avatar} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#12152a] ${
                        isOnline ? "bg-[#4fd6a0]" : "bg-[#565c80]"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-white truncate group-hover:text-[#ff935f] transition-colors">
                      {f.username}
                    </div>
                    <div className={`text-xs mt-0.5 ${isOnline ? "text-[#58dcaa] font-semibold" : "text-[#7b81a6]"}`}>
                      {isOnline ? "Онлайн" : formatLastSeen()}
                    </div>

                    {lastMovie && (
                      <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2">
                        <div className="w-7 h-[42px] rounded-[5px] overflow-hidden shrink-0">
                          <Poster src={lastMovie.posterUrl} title={lastMovie.title} small />
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="text-[11px] text-[#8b91b5]">Смотрел</div>
                          <div className="text-xs font-bold text-[#e9ebf7] truncate" title={lastMovie.title}>
                            {lastMovie.title}
                          </div>
                          {lastMovie.rating && (
                            <div className="text-xs font-extrabold text-[#ff935f]">
                              {lastMovie.rating}/10
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}

          <button
            onClick={() => setActiveTab("friends")}
            className={`w-full min-h-[44px] flex items-center gap-2 rounded-xl px-4 text-sm ${BTN_SOFT} !text-[#8b91b5] hover:!text-white`}
          >
            <Icon n="search" className="w-4 h-4 opacity-60" />
            Поиск и добавление
          </button>
        </aside>
        )}
      </div>
        </div>
      </div>

      <nav
        aria-label="Разделы"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0d1021]/95 backdrop-blur-xl border-t border-white/[0.07] flex justify-around px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] safe-x"
      >
        {navItems.filter((item) => item.id !== "profile").map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-current={active ? "page" : undefined}
              className="flex-1 min-w-0 min-h-[48px] flex flex-col items-center justify-center gap-1 px-1"
            >
              <span className="relative">
                <Icon
                  n={item.icon}
                  className={`w-[22px] h-[22px] ${active ? ORANGE_FILTER : "opacity-55"}`}
                />
                {item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[10px] font-extrabold leading-none flex items-center justify-center"
                    aria-label={`Новых заявок: ${item.badge}`}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </span>
              <span
                className={`max-w-full truncate text-[10px] font-bold ${active ? "text-[#ff935f]" : "text-[#7b81a6]"}`}
              >
                {item.short ?? item.label}
              </span>
            </button>
          );
        })}
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
        <div className="fixed inset-0 bg-[#04050c]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12152a] border border-white/10 rounded-[24px] max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-7 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-xl font-semibold text-white">
                Результаты импорта
              </h3>
              <button
                onClick={() => setImportResult(null)}
                aria-label="Закрыть" className="w-11 h-11 flex items-center justify-center bg-white/[0.07] hover:bg-white/[0.12] rounded-full"
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
                  className="bg-[#171b38] rounded-2xl p-4 text-center"
                >
                  <div className={`font-display text-3xl font-bold ${s.color}`}>
                    {s.n}
                  </div>
                  <div className="text-xs text-[#8b91b5]">{s.label}</div>
                </div>
              ))}
            </div>

            {importResult.failed.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm text-red-300 mb-2">Не найдено:</h4>
                <div className="bg-[#0a0c18] rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
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
              className={`w-full h-12 rounded-xl text-sm ${BTN_ORANGE}`}
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
