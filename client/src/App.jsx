import { useState, useEffect, useRef, useMemo } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import Landing from "./components/Landing";
import Footer from "./components/Footer";
import PrivacyPolicy from "./components/PrivacyPolicy";
import { useHashRoute, leaveHashRoute } from "./hooks/useHashRoute";
import { POLICY_HASH, CONTACT_EMAIL, LOGIN_HASH, REGISTER_HASH } from "./legal";
import FriendsPanel from "./components/FriendsPanel";
import ProfileModal from "./components/ProfileModal";
import ReviewModal from "./components/ReviewModal";
import ConfirmDialog from "./components/ConfirmDialog";
import MovieDetailsModal from "./components/MovieDetailsModal";
import PersonPage from "./components/PersonPage";
import ProfilePage from "./components/ProfilePage";
import StatsPage from "./components/StatsPage";
import FriendsFeed from "./components/FriendsFeed";
import HomeFeed from "./components/HomeFeed";
import WhatToWatch from "./components/WhatToWatch";
import SharedLists from "./components/SharedLists";
import { NotificationsBell, InviteToast } from "./components/Notifications";
import { listsRequest } from "./utils/listsApi";
import { SORT_OPTIONS, sortMovies } from "./utils/sortMovies";
import MovieFilters from "./components/MovieFilters";
import {
  DEFAULT_FILTERS,
  KIND_OPTIONS,
  collectFacets,
  filterMovies,
  isFiltering,
} from "./utils/filterMovies";
import { metaFromTmdb } from "./utils/genres";
import { useMetaBackfill } from "./hooks/useMetaBackfill";
import Icon from "./components/Icon";
import { Chip, MovieCard, CornerButton, Grid, Empty, Avatar, Logo, Poster, SubTabs } from "./components/ui";
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
  INPUT,
} from "./components/styles";
import { API_URL, TMDB_API_KEY, TMDB, POSTER } from "./config";

function MovieTracker() {
  const [friendsLastWatched, setFriendsLastWatched] = useState({});
  const { user, token, logout, getFriends, getFriendRequests, handleFriendRequest, updateAvatar, deleteAccount } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
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
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const [movieFilter, setMovieFilter] = useState("watched");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const [importResult, setImportResult] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [pageStack, setPageStack] = useState([]);
  const [lastWatchedData, setLastWatchedData] = useState({});
  const [reviewMovieId, setReviewMovieId] = useState(null);
  const [openListId, setOpenListId] = useState(null);
  // Уведомления: заявки в друзья и приглашения в общие списки
  const [friendRequests, setFriendRequests] = useState([]);
  const [listInvites, setListInvites] = useState([]);
  const [toastInvite, setToastInvite] = useState(null);
  const [listsRefreshKey, setListsRefreshKey] = useState(0);
  const refreshNotificationsRef = useRef(() => {});
  // Удаление аккаунта: окно подтверждения с паролем
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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
      (activeTab === "home" ||
        activeTab === "movies" ||
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

  // Уведомления (заявки в друзья и приглашения в общие списки):
  // при входе, раз в минуту и при возврате в приложение
  useEffect(() => {
    if (!token || !user?.id) return undefined;
    let cancelled = false;
    const notifiedKey = `listInvitesNotified:${user.id}`;

    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const [requests, invites] = await Promise.all([
        getFriendRequests(),
        listsRequest(token, "/invites"),
      ]);
      if (cancelled) return;
      const requestList = Array.isArray(requests) ? requests : [];
      setFriendRequests(requestList);
      setRequestsCount(requestList.length);
      if (!invites.ok) return;
      const inviteList = Array.isArray(invites.data) ? invites.data : [];
      setListInvites(inviteList);

      // Всплывающее уведомление показываем один раз на каждое новое приглашение
      let notified = [];
      try {
        notified = JSON.parse(localStorage.getItem(notifiedKey) || "[]");
      } catch {
        notified = [];
      }
      const fresh = inviteList.find((i) => !notified.includes(i.listId));
      if (fresh) {
        setToastInvite(fresh);
        try {
          const ids = [...new Set([...notified, ...inviteList.map((i) => i.listId)])].slice(-100);
          localStorage.setItem(notifiedKey, JSON.stringify(ids));
        } catch {
          /* без хранилища уведомление может показаться повторно */
        }
      }
    };

    refreshNotificationsRef.current = refresh;
    refresh();
    const timer = setInterval(refresh, 60 * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token, user?.id]);

  const acceptInvite = async (invite) => {
    const result = await listsRequest(token, `/${invite.listId}/accept`, { method: "POST" });
    setToastInvite((t) => (t?.listId === invite.listId ? null : t));
    setListInvites((prev) => prev.filter((i) => i.listId !== invite.listId));
    if (result.ok) {
      setListsRefreshKey((k) => k + 1);
      setOpenListId(invite.listId);
      setActiveTab("together");
    }
    refreshNotificationsRef.current();
  };

  const declineInvite = async (invite) => {
    await listsRequest(token, `/${invite.listId}/decline`, { method: "POST" });
    setToastInvite((t) => (t?.listId === invite.listId ? null : t));
    setListInvites((prev) => prev.filter((i) => i.listId !== invite.listId));
    refreshNotificationsRef.current();
  };

  const answerFriendRequest = async (request, action) => {
    await handleFriendRequest(request.id, action);
    setFriendRequests((prev) => prev.filter((r) => r.id !== request.id));
    setRequestsCount((n) => Math.max(0, n - 1));
    if (action === "accept") loadFriends();
    refreshNotificationsRef.current();
  };

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

  // Возвращает созданную запись (или null), чтобы можно было сразу открыть отзыв
  const addMovie = async (movie) => {
    try {
      const res = await fetch(`${API_URL}/api/movies`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(movie),
      });
      const created = res.ok ? await res.json().catch(() => null) : null;
      await fetchMovies();
      return created;
    } catch (error) {
      console.error("Ошибка добавления:", error);
      return null;
    }
  };

  // Запись из результата TMDB для добавления в журнал
  const tmdbToEntry = (movie, status) => ({
    tmdbId: movie.id,
    title: movie.title || movie.name,
    posterUrl: movie.poster_path ? `${POSTER}${movie.poster_path}` : null,
    status,
    mediaType: movie.media_type === "tv" ? "tv" : "movie",
    ...metaFromTmdb(movie),
  });

  // Несколько фильмов в «Буду смотреть» разом (части коллекции), журнал обновляем один раз
  const addToWatchlist = async (items) => {
    for (const item of items) {
      try {
        await fetch(`${API_URL}/api/movies`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(tmdbToEntry({ ...item, media_type: "movie" }, "WATCHLIST")),
        });
      } catch (error) {
        console.error("Ошибка добавления:", error);
      }
    }
    await fetchMovies();
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

  // Кнопка «Посмотреть» на карточке: добавить в список / убрать из него
  const toggleWatchlist = async (movie, existing) => {
    if (!existing) await addMovie(tmdbToEntry(movie, "WATCHLIST"));
    else if (existing.status === "WATCHLIST") await deleteMovie(existing.id);
    else await updateMovieStatus(existing.id, "WATCHLIST");
  };

  // Кнопка «Просмотрено»: отметить и сразу открыть оценку
  const markWatchedAndRate = async (movie, existing) => {
    if (!existing) {
      const created = await addMovie(tmdbToEntry(movie, "WATCHED"));
      if (created?.id) setReviewMovieId(created.id);
      return;
    }
    if (existing.status !== "WATCHED") await updateMovieStatus(existing.id, "WATCHED");
    setReviewMovieId(existing.id);
  };

  // «Быстрый лог» на главной: добавить (если нужно) и сразу сохранить оценку.
  // Оценка сама переводит фильм в «Просмотрено» на сервере
  const quickLog = async (movie, review) => {
    const type = movie.media_type === "tv" ? "tv" : "movie";
    const existing = movies.find((m) => m.tmdbId === movie.id && (m.mediaType === "tv" ? "tv" : "movie") === type);
    const id = existing?.id || (await addMovie(tmdbToEntry({ ...movie, media_type: type }, "WATCHED")))?.id;
    if (!id) return { ok: false, error: "Не удалось добавить фильм в журнал" };
    return saveReview(id, review);
  };

  // Кнопка «Отметить просмотр» в сайдбаре: на главную и сразу в поле «Быстрого лога»
  const openQuickLog = () => {
    setActiveTab("home");
    setTimeout(() => {
      const input = document.getElementById("quicklog-input");
      input?.focus({ preventScroll: true });
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
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
  const searchInputRef = useRef(null);

  // Кнопка-лупа: открыть поиск и сразу поставить курсор в поле
  const openSearch = () => {
    setActiveTab("search");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };
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

  const openPerson = (person) =>
    setPageStack((stack) => [...stack, { kind: "person", person }]);

  // Страница фильма из TMDB: основная (historyKey «details») или открытая поверх других
  const renderMovieDetails = (movie, historyKey, onClose) => (
    <MovieDetailsModal
      key={`${historyKey}-${movie.media_type || "movie"}-${movie.id}`}
      movie={movie}
      historyKey={historyKey}
      existing={movies.find(
        (m) =>
          m.tmdbId === movie.id &&
          m.mediaType === (movie.media_type === "tv" ? "tv" : "movie"),
      )}
      onClose={onClose}
      onOpenReview={setReviewMovieId}
      onOpenPerson={openPerson}
      onEpisodesChanged={fetchMovies}
      movies={movies}
      onOpenMovie={(next) => setPageStack((stack) => [...stack, { kind: "movie", movie: next }])}
      onAddToWatchlist={addToWatchlist}
      onAdd={async (status, details) => {
        const created = await addMovie({
          tmdbId: movie.id,
          title: movie.title || movie.name,
          posterUrl: movie.poster_path ? `${POSTER}${movie.poster_path}` : null,
          status,
          mediaType: movie.media_type === "tv" ? "tv" : "movie",
          ...metaFromTmdb(details || movie),
        });
        // «Смотрел» сразу открывает оценку, как и кнопка на карточке
        if (status === "WATCHED" && created?.id) setReviewMovieId(created.id);
      }}
    />
  );

  const byStatus = movies.filter((m) =>
    movieFilter === "watchlist" ? m.status === "WATCHLIST" : m.status === "WATCHED",
  );
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
      id: "friends",
      label: "Друзья",
      icon: "users",
      badge: requestsCount + listInvites.length,
    },
    // «Искать» и «Профиль» на телефоне открываются отдельной кнопкой-лупой и из шапки
    { id: "search", label: "Искать", icon: "compass", desktopOnly: true },
    { id: "profile", label: "Профиль", icon: "user-round", desktopOnly: true },
  ];

  // Разделы, которые живут внутри других: «Что смотреть» — в списке, лента и «Вместе» — в друзьях
  const SECTION_OF = { discover: "movies", feed: "friends", together: "friends" };
  const activeSection = activeTab.startsWith("profile-") ? "profile" : SECTION_OF[activeTab] || activeTab;
  const subTabs = {
    movies: [
      { id: "movies", label: "Мой журнал" },
      { id: "discover", label: "Что смотреть" },
    ],
    friends: [
      { id: "friends", label: "Друзья", badge: requestsCount },
      { id: "feed", label: "Лента" },
      { id: "together", label: "Вместе", badge: listInvites.length },
    ],
  }[activeSection];

  const mobileNavItems = navItems.filter((item) => !item.desktopOnly);
  const mobileNavIndex = mobileNavItems.findIndex((item) => item.id === activeSection);

  const tabs = [
    { id: "watched", label: "Просмотрено" },
    { id: "watchlist", label: "Буду смотреть" },
  ];

  const statItems = [
    { v: movies.length, l: "Всего", c: "text-white" },
    { v: watchedCount, l: "Смотрел", c: "text-[#58dcaa]" },
    { v: watchlistCount, l: "В планах", c: "text-[#86b8ff]" },
  ];

  return (
    <div className="min-h-app mg-canvas text-[#cfcdd8]">
      <div className="flex">
        <aside className="hidden lg:flex w-64 shrink-0 sticky top-0 h-[100dvh] flex-col gap-6 overflow-y-auto border-r border-white/[0.06] bg-mg-sunken px-[18px] py-6">
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
                <span className="block text-xs text-[#8f8d9b] truncate">{user?.email}</span>
              </span>
            </button>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {statItems.map((s) => (
                <div key={s.l}>
                  <div className={`font-display text-lg font-semibold ${s.c}`}>{s.v}</div>
                  <div className="text-[11px] text-[#8f8d9b] mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={openQuickLog}
            className={`w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm ${BTN_ORANGE}`}
          >
            <Icon n="plus" className={`w-4 h-4 ${DARK_ICON}`} />
            Отметить просмотр
          </button>

          <nav className="space-y-1" aria-label="Разделы">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#ff7a45]/[0.14] text-[#ff935f]"
                      : "text-[#a19fad] hover:bg-white/5 hover:text-white"
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
      <header className="sticky top-0 z-40 bg-mg-bg/60 backdrop-blur-2xl backdrop-saturate-150 lg:bg-mg-bg lg:backdrop-blur-none border-b border-white/[0.06] safe-top safe-x">
        <div className="flex items-center gap-2.5 sm:gap-3 px-4 lg:px-8 h-[72px]">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className="lg:hidden shrink-0"
            aria-label="На главную"
          >
            <Logo />
          </button>

          <div className="flex-1" />

          <NotificationsBell
            invites={listInvites}
            requests={friendRequests}
            onAcceptInvite={acceptInvite}
            onDeclineInvite={declineInvite}
            onAcceptFriend={(r) => answerFriendRequest(r, "accept")}
            onDeclineFriend={(r) => answerFriendRequest(r, "reject")}
            onOpenFriend={setSelectedUserId}
          />

          <div className="relative flex items-center shrink-0" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((open) => !open)}
              aria-label="Открыть меню аккаунта"
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              className="relative rounded-full outline-none ring-offset-2 ring-offset-mg-bg focus-visible:ring-2 focus-visible:ring-[#ff7a45]"
            >
              <Avatar name={user?.username} avatar={user?.avatar} size="w-11 h-11" />
            </button>
            {avatarMenuOpen && (
              <div role="menu" aria-label="Меню аккаунта" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-mg-pop mg-pop-glass p-2 shadow-2xl shadow-black/50">
                <div className="flex items-center gap-3 border-b border-white/[0.08] px-3 py-3 mb-1">
                  <Avatar name={user?.username} avatar={user?.avatar} size="w-11 h-11" text="text-base" />
                  <div className="min-w-0">
                    <div className="font-extrabold text-white truncate">{user?.username}</div>
                    <div className="text-xs text-[#8f8d9b] truncate">{user?.email}</div>
                  </div>
                </div>
                <button role="menuitem" onClick={() => { setActiveTab("profile"); setAvatarMenuOpen(false); }} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#cfcdd8] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="user-round" className="w-4 h-4" /> Профиль
                </button>
                <button role="menuitem" onClick={() => { setActiveTab("friends"); setAvatarMenuOpen(false); }} className="lg:hidden w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#cfcdd8] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="users" className="w-4 h-4" /> Друзья
                  {requestsCount > 0 && <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center">{requestsCount}</span>}
                </button>
                <button role="menuitem" onClick={() => { setActiveTab("profile-settings"); setAvatarMenuOpen(false); }} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#cfcdd8] hover:bg-white/[0.06] hover:text-white text-left transition-colors">
                  <Icon n="settings" className="w-4 h-4" /> Настройки профиля
                </button>
                <a role="menuitem" href={`mailto:${CONTACT_EMAIL}`} onClick={() => setAvatarMenuOpen(false)} className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#cfcdd8] hover:bg-white/[0.06] hover:text-white transition-colors">
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
          {subTabs && (
            <SubTabs items={subTabs} active={activeTab} onChange={setActiveTab} />
          )}
          {/* key пересоздаёт обёртку при смене вкладки, чтобы проиграть анимацию входа */}
          <div key={activeTab} className="mg-tab-enter">
          {activeTab === "home" && (
            <HomeFeed
              movies={movies}
              onOpenMovie={setSelectedMovie}
              onOpenEntry={(movie) =>
                movie.tmdbId
                  ? setSelectedMovie({
                      id: movie.tmdbId,
                      media_type: movie.mediaType,
                      title: movie.title,
                      posterUrl: movie.posterUrl,
                    })
                  : setReviewMovieId(movie.id)
              }
              onBrowse={() => setActiveTab("search")}
              onQuickLog={quickLog}
              onOpenStats={() => setActiveTab("profile-stats")}
              onOpenJournal={() => setActiveTab("movies")}
            />
          )}
          {activeTab === "movies" && (
            <div className="space-y-6">
              <div>
                <div className={`${EYEBROW} mb-2.5`}>Мой список</div>
                <h1 className={PAGE_TITLE}>Журнал {user?.username}</h1>
              </div>

              {importing && (
                <div className={`${PANEL} p-4`}>
                  <div className="flex justify-between text-sm mb-2.5">
                    <span className="font-bold text-white">Импорт фильмов</span>
                    <span className="text-[#8f8d9b]">{importProgress.current} из {importProgress.total}</span>
                  </div>
                  <div className="h-2 bg-mg-sunken rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff7a45] rounded-full transition-all"
                      style={{
                        width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <SubTabs
                  items={tabs.map((t) => ({
                    ...t,
                    count: t.id === "watched" ? watchedCount : watchlistCount,
                  }))}
                  active={movieFilter}
                  onChange={setMovieFilter}
                  className="flex"
                  itemClass="sm:w-[190px]"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <SubTabs
                    items={KIND_OPTIONS}
                    active={filters.kind}
                    onChange={(kind) => setFilters({ ...filters, kind })}
                    className="flex flex-1 sm:flex-none min-w-0"
                    itemClass="sm:w-[120px]"
                  />
                  <label className="mg-glass-chip relative !p-0 sm:!pl-4 sm:!pr-1 w-12 sm:w-auto h-12 !justify-center ml-auto shrink-0 text-[13px] !font-bold text-[#b4b2bf]" title="Сортировка">
                    <Icon n="arrow-down-up" className="w-[18px] h-[18px] sm:w-4 sm:h-4 sm:opacity-70" />
                    <span className="sr-only">Сортировка</span>
                    <select
                      value={sortMode}
                      onChange={(e) => changeSort(e.target.value)}
                      aria-label="Сортировка"
                      className="absolute inset-0 opacity-0 sm:static sm:opacity-100 h-12 sm:h-10 w-full sm:w-auto bg-transparent pr-2 text-sm font-bold text-white focus:outline-none [&>option]:bg-mg-pop"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
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
                    <p className="text-[#cfcdd8] mb-4">
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
                  <Empty text="Здесь пока пусто. Найди фильм через лупу внизу или раздел «Искать» и добавь его." />
                )
              ) : (
                <Grid>
                  {filteredMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      poster={movie.posterUrl}
                      title={movie.title}
                      onClick={() =>
                        movie.tmdbId
                          ? setSelectedMovie({
                              id: movie.tmdbId,
                              media_type: movie.mediaType,
                              title: movie.title,
                              posterUrl: movie.posterUrl,
                            })
                          : setReviewMovieId(movie.id)
                      }
                      chips={
                        <>
                          {/* Год теперь под карточкой, а «Сериал» не нужен, когда и так выбраны сериалы */}
                          {movie.mediaType === "tv" && filters.kind !== "tv" && (
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
                      topLeft={
                        <CornerButton
                          icon="eye"
                          label={movie.status === "WATCHLIST" ? "Убрать из «Буду смотреть»" : "Буду смотреть"}
                          active={movie.status === "WATCHLIST"}
                          onClick={() => toggleWatchlist(null, movie)}
                        />
                      }
                      topRight={
                        <CornerButton
                          icon="check"
                          tone="green"
                          label={movie.status === "WATCHED" ? "Изменить оценку" : "Просмотрено"}
                          active={movie.status === "WATCHED"}
                          onClick={() => markWatchedAndRate(null, movie)}
                        />
                      }
                      footerLeft={
                        movie.releaseYear
                          ? movie.releaseYear
                          : movie.mediaType === "tv"
                            ? "Сериал"
                            : "Фильм"
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
                <p className="mt-2.5 text-sm text-[#8f8d9b]">Ищи по названию или подбери фильмы и сериалы по параметрам</p>
              </div>

              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault(); // без перезагрузки страницы по Enter/«Найти» на клавиатуре
                  searchMovies(searchQuery);
                  e.currentTarget.querySelector("input")?.blur(); // прячем клавиатуру телефона
                }}
                className="mg-glass-chip !flex !rounded-full !p-1.5 !pl-4 gap-2"
              >
                <Icon n="search" className={`w-[18px] h-[18px] ${searchQuery ? ORANGE_FILTER : "opacity-60"}`} />
                <input
                  ref={searchInputRef}
                  type="search" /* показывает кнопку с лупой на клавиатуре телефона */
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Фильм или сериал"
                  aria-label="Поиск фильмов и сериалов"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchMoviesDebounced(e.target.value);
                  }}
                  className="flex-1 min-w-0 h-11 bg-transparent text-base font-semibold text-white placeholder:text-[#8f8d9b] placeholder:font-medium focus:outline-none"
                />
                <button type="submit" className={`h-11 px-5 rounded-full text-sm shrink-0 active:scale-95 ${BTN_ORANGE}`}>
                  Найти
                </button>
              </form>

              <section className={`${PANEL} p-4 sm:p-6 space-y-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={SECTION_TITLE}>Подбор по фильтрам</h2>
                    <p className="mt-1.5 text-[13px] text-[#8f8d9b]">Фильтры применяются ко всему каталогу TMDB, а не только к загруженным карточкам</p>
                  </div>
                  <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`h-10 px-4 rounded-xl text-sm ${BTN_SOFT}`}>
                    {filtersOpen ? "Свернуть" : "Показать фильтры"}
                  </button>
                </div>
                {filtersOpen && <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    <div className="text-xs font-bold text-[#b4b2bf] space-y-2">
                      <span className="block">Тип контента</span>
                      <div className="flex gap-1 p-[3px] rounded-xl bg-mg-sunken border border-white/[0.08]" role="group" aria-label="Тип контента">
                        {[{ v: "movie", l: "Фильмы" }, { v: "tv", l: "Сериалы" }].map((o) => (
                          <button key={o.v} type="button" aria-pressed={catalogType === o.v} onClick={() => { setCatalogType(o.v); setSelectedGenres([]); }} className={`flex-1 h-9 rounded-[9px] text-[13px] font-bold transition-colors ${catalogType === o.v ? "bg-mg-raised text-white" : "text-[#8f8d9b] hover:text-white"}`}>{o.l}</button>
                        ))}
                      </div>
                    </div>
                    <label className="text-xs font-bold text-[#b4b2bf] space-y-2 block">Год от
                      <input type="number" min="1900" max="2026" placeholder="Например, 2000" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="w-full h-11 rounded-xl bg-mg-sunken border border-white/[0.09] px-3.5 text-sm font-medium text-white placeholder:text-[#6f6d7b] focus:outline-none focus:border-[#ff7a45]" />
                    </label>
                    <label className="text-xs font-bold text-[#b4b2bf] space-y-2 block">Год до
                      <input type="number" min="1900" max="2026" placeholder="Например, 2026" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="w-full h-11 rounded-xl bg-mg-sunken border border-white/[0.09] px-3.5 text-sm font-medium text-white placeholder:text-[#6f6d7b] focus:outline-none focus:border-[#ff7a45]" />
                    </label>
                    <label className="text-xs font-bold text-[#b4b2bf] space-y-2 block">Минимальный рейтинг
                      <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="w-full h-11 rounded-xl bg-mg-sunken border border-white/[0.09] px-3 text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]">
                        <option value="0">Любой рейтинг</option><option value="5">От 5.0</option><option value="6">От 6.0</option><option value="7">От 7.0</option><option value="7.5">От 7.5</option><option value="8">От 8.0</option><option value="8.5">От 8.5</option>
                      </select>
                    </label>
                  </div>
                  <div className="text-xs font-bold text-[#b4b2bf] space-y-2.5">
                    <span className="block">Жанры <span className="font-medium text-[#6f6d7b]">можно выбрать несколько</span></span>
                    <div className="flex flex-wrap gap-2">
                      {catalogGenres.map((genre) => {
                        const active = selectedGenres.includes(genre.id);
                        return <button type="button" key={genre.id} aria-pressed={active} onClick={() => setSelectedGenres((prev) => active ? prev.filter((id) => id !== genre.id) : [...prev, genre.id])} className={`min-h-[38px] rounded-full border px-4 text-[13px] font-bold transition ${active ? "border-[#ff7a45] bg-[#ff7a45]/15 text-[#ffa27d]" : "border-white/10 bg-mg-sunken text-[#b4b2bf] hover:border-white/30"}`}>{genre.name}</button>;
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    <label className="text-xs font-bold text-[#b4b2bf] space-y-2 flex-1 block">Сортировка
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full h-11 rounded-xl bg-mg-sunken border border-white/[0.09] px-3 text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]">
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
              {catalogLoading && <p className="py-4 text-center text-sm text-[#b4b2bf]">Загружаем результаты из TMDB…</p>}

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
                      const existing = addedMovieIds.has(`${mediaType}-${movie.id}`)
                        ? movies.find((m) => m.tmdbId === movie.id && m.mediaType === mediaType)
                        : null;
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
                              {existing?.rating && (
                                <Chip tone="orange">
                                  <Icon n="star" className={`w-3 h-3 inline -mt-0.5 mr-0.5 ${ORANGE_FILTER}`} />
                                  {existing.rating}
                                </Chip>
                              )}
                            </>
                          }
                          topLeft={
                            <CornerButton
                              icon="eye"
                              label={existing?.status === "WATCHLIST" ? "Убрать из «Буду смотреть»" : "Буду смотреть"}
                              active={existing?.status === "WATCHLIST"}
                              onClick={() => toggleWatchlist(movie, existing)}
                            />
                          }
                          topRight={
                            <CornerButton
                              icon="check"
                              tone="green"
                              label={existing?.status === "WATCHED" ? "Изменить оценку" : "Просмотрено"}
                              active={existing?.status === "WATCHED"}
                              onClick={() => markWatchedAndRate(movie, existing)}
                            />
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
                  <span className="text-sm text-[#8f8d9b]">Страница {catalogPage} из {catalogTotalPages}</span>
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

          {activeTab === "together" && (
            <SharedLists
              token={token}
              friends={friends}
              onOpenMovie={setSelectedMovie}
              openListId={openListId}
              onOpenList={setOpenListId}
              invites={listInvites}
              onAcceptInvite={acceptInvite}
              onDeclineInvite={declineInvite}
              refreshKey={listsRefreshKey}
            />
          )}

          {activeTab === "friends" && (
            <div className="max-w-3xl">
              <div className={`${EYEBROW} mb-2.5`}>Люди</div>
              <h1 className={`${PAGE_TITLE} mb-7`}>Сообщество</h1>
              <FriendsPanel
                onUserClick={setSelectedUserId}
                onRequestsChange={(n) => {
                  setRequestsCount(n);
                  refreshNotificationsRef.current();
                }}
                onFriendsChange={loadFriends}
              />
            </div>
          )}

          {activeTab === "profile" && (
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                aria-label="Выбрать фотографию профиля"
              />
              <ProfilePage
                user={user}
                movies={movies}
                friends={friends}
                avatarSaving={avatarSaving}
                avatarMessage={avatarMessage}
                avatarError={avatarError}
                onPickAvatar={() => {
                  setAvatarMessage("");
                  setAvatarError("");
                  avatarInputRef.current?.click();
                }}
                onOpenSettings={() => setActiveTab("profile-settings")}
                onOpenStats={() => setActiveTab("profile-stats")}
                onOpenFriend={setSelectedUserId}
                onManageFriends={() => setActiveTab("friends")}
                onOpenMovie={setSelectedMovie}
              />
            </>
          )}

          {activeTab === "profile-stats" && (
            <StatsPage
              movies={movies}
              onBack={() => setActiveTab("profile")}
              onOpenMovie={(movie) =>
                movie.tmdbId
                  ? setSelectedMovie({
                      id: movie.tmdbId,
                      media_type: movie.mediaType,
                      title: movie.title,
                      posterUrl: movie.posterUrl,
                    })
                  : setReviewMovieId(movie.id)
              }
            />
          )}

          {activeTab === "profile-settings" && (
            <div className="max-w-3xl space-y-5 pb-28">
              <button onClick={() => setActiveTab("profile")} className="inline-flex items-center gap-2 min-h-[44px] text-sm font-bold text-[#8f8d9b] hover:text-white"><Icon n="arrow-left" className="w-4 h-4" /> Назад в профиль</button>
              <div><h1 className={PAGE_TITLE}>Настройки профиля</h1><p className="text-sm text-[#8f8d9b] mt-2.5">Управление аккаунтом и данными журнала.</p></div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="image" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Аватар профиля</h2>
                <p className="text-sm text-[#8f8d9b] mb-5 leading-relaxed">Загрузи изображение с устройства. Оно будет автоматически обрезано по размеру и сжато.</p>
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
                <p className="text-xs text-[#8f8d9b] mt-3">Поддерживаются изображения JPG, PNG, WebP и другие форматы, которые открывает браузер. Исходный файл — до 10 МБ.</p>
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="user-round-pen" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Личные данные</h2>
                <p className="text-sm text-[#8f8d9b] mb-4">Измени никнейм и данные профиля.</p>
                <button onClick={() => setSelectedUserId(user?.id)} className={`w-full h-11 rounded-xl text-sm ${BTN_SOFT}`}>Редактировать профиль</button>
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center shrink-0"><Icon n="download" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} /></span>Импорт из файла</h2>
                <p className="text-sm text-[#8f8d9b] mb-5 leading-relaxed">Загрузите .txt или .docx файл со списком фильмов. Каждая строка — название и, если хотите, оценка в конце.</p>
                <div className="rounded-2xl border-[1.5px] border-dashed border-white/[0.16] p-6 sm:p-7 flex flex-col items-center gap-3 text-center">
                  <Icon n="file-up" className={`w-7 h-7 ${ORANGE_FILTER}`} />
                  <label className={`inline-flex items-center justify-center h-11 px-6 rounded-xl text-sm cursor-pointer ${importing ? "bg-mg-raised text-[#8f8d9b] cursor-not-allowed font-bold" : BTN_ORANGE}`}>
                    {importing ? `Импорт... ${importProgress.current}/${importProgress.total}` : "Выбрать файл"}
                    <input type="file" accept=".txt,.docx" onChange={handleDocxImport} disabled={importing} className="hidden" />
                  </label>
                </div>
              </div>
              <div className={`${PANEL} p-5 sm:p-6`}>
                <h2 className={`${SECTION_TITLE} mb-2`}>Сессия</h2><p className="text-sm text-[#8f8d9b] mb-5">Выйти из текущего аккаунта на этом устройстве.</p>
                <button onClick={logout} className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm ${BTN_RED}`}><Icon n="log-out" /> Выйти из аккаунта</button>
              </div>
              <div className="rounded-[20px] border border-red-400/25 bg-red-500/[0.06] p-5 sm:p-6">
                <h2 className={`flex items-center gap-3 ${SECTION_TITLE} mb-2.5`}><span className="w-[38px] h-[38px] rounded-xl bg-red-400/[0.14] flex items-center justify-center shrink-0"><Icon n="trash-2" className="w-[18px] h-[18px] [filter:invert(1)_sepia(1)_saturate(5)_hue-rotate(310deg)_brightness(1.1)]" /></span>Удалить аккаунт</h2>
                <p className="text-sm text-[#b4b2bf] mb-5 leading-relaxed">Аккаунт удалится навсегда вместе с журналом, оценками, отзывами, друзьями и созданными тобой общими списками. Восстановить его будет нельзя.</p>
                <button
                  type="button"
                  onClick={() => { setDeletePassword(""); setDeleteError(""); setDeleteAccountOpen(true); }}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-extrabold bg-red-500 hover:bg-red-400 text-white transition-colors"
                >
                  Удалить аккаунт
                </button>
              </div>
            </div>
          )}
          {activeTab === "profile-settings" && <Footer className="mt-12" />}
          </div>
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
            <p className={`${PANEL} text-sm text-[#8f8d9b] text-center py-6 px-4`}>
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
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-mg-pop ${
                        isOnline ? "bg-[#4fd6a0]" : "bg-[#55535f]"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-white truncate group-hover:text-[#ff935f] transition-colors">
                      {f.username}
                    </div>
                    <div className={`text-xs mt-0.5 ${isOnline ? "text-[#58dcaa] font-semibold" : "text-[#7c7a88]"}`}>
                      {isOnline ? "Онлайн" : formatLastSeen()}
                    </div>

                    {lastMovie && (
                      <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2">
                        <div className="w-7 h-[42px] rounded-[5px] overflow-hidden shrink-0">
                          <Poster src={lastMovie.posterUrl} title={lastMovie.title} small />
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="text-[11px] text-[#8f8d9b]">Смотрел</div>
                          <div className="text-xs font-bold text-[#ecebf1] truncate" title={lastMovie.title}>
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
            className={`w-full min-h-[44px] flex items-center gap-2 rounded-xl px-4 text-sm ${BTN_SOFT} !text-[#8f8d9b] hover:!text-white`}
          >
            <Icon n="search" className="w-4 h-4 opacity-60" />
            Поиск и добавление
          </button>
        </aside>
        )}
      </div>
        </div>
      </div>

      {/* Нижний док на телефоне: панель разделов и отдельная кнопка поиска справа */}
      <div className="mg-dock-bottom lg:hidden fixed z-40 left-3 right-3 mx-auto max-w-[480px] flex items-stretch gap-2">
        <nav
          aria-label="Разделы"
          className="mg-glass-nav flex-1 min-w-0 rounded-full p-1.5"
        >
          <div className="relative flex">
            {/* Подсветка активной вкладки плавно переезжает между пунктами */}
            <span
              aria-hidden="true"
              className="mg-glass-pill absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${100 / mobileNavItems.length}%`,
                transform: `translateX(${Math.max(mobileNavIndex, 0) * 100}%)`,
                opacity: mobileNavIndex < 0 ? 0 : 1,
              }}
            />
            {mobileNavItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className="relative flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 px-0 rounded-full active:scale-90 transition-transform duration-200"
                >
                  <span key={active ? "on" : "off"} className={`relative ${active ? "mg-nav-pop" : ""}`}>
                    <Icon
                      n={item.icon}
                      className={`w-[22px] h-[22px] transition-opacity duration-300 ${active ? ORANGE_FILTER : "opacity-60"}`}
                    />
                    {item.badge > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[10px] font-extrabold leading-none flex items-center justify-center"
                        aria-label={`Новых уведомлений: ${item.badge}`}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`max-w-full truncate text-[10px] font-semibold tracking-[-0.01em] transition-colors duration-300 ${active ? "text-[#ff935f]" : "text-[#b4b2bf]/70"}`}
                  >
                    {item.short ?? item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        <button
          type="button"
          onClick={openSearch}
          aria-label="Поиск"
          aria-current={activeTab === "search" ? "page" : undefined}
          className={`mg-glass-nav shrink-0 w-16 rounded-full flex items-center justify-center transition-transform active:scale-90 ${activeTab === "search" ? "mg-glass-nav--active" : ""}`}
        >
          <Icon n="search" className={`w-6 h-6 ${activeTab === "search" ? ORANGE_FILTER : ""}`} />
        </button>
      </div>

      {selectedUserId && (
        <ProfileModal
          key={selectedUserId}
          userId={selectedUserId}
          token={token}
          onClose={() => setSelectedUserId(null)}
          onUserClick={(id) => setSelectedUserId(id)}
          onFriendRemoved={loadFriends}
          onOpenMovie={setSelectedMovie}
        />
      )}

      {selectedMovie && renderMovieDetails(selectedMovie, "details", () => {
        setSelectedMovie(null);
        setPageStack([]);
      })}

      {/* Страницы, открытые поверх фильма: актёр, затем его фильм и так далее.
          «Назад» снимает только верхнюю */}
      {pageStack.map((page, index) => {
        const historyKey = `stack-${index}`;
        const closePage = () => setPageStack((stack) => stack.slice(0, index));
        return page.kind === "person" ? (
          <PersonPage
            key={`${historyKey}-person-${page.person.id}`}
            person={page.person}
            movies={movies}
            historyKey={historyKey}
            onClose={closePage}
            onOpenMovie={(movie) => setPageStack((stack) => [...stack, { kind: "movie", movie }])}
          />
        ) : (
          renderMovieDetails(page.movie, historyKey, closePage)
        );
      })}

      {toastInvite && (
        <InviteToast
          invite={toastInvite}
          onAccept={() => acceptInvite(toastInvite)}
          onDecline={() => declineInvite(toastInvite)}
          onClose={() => setToastInvite(null)}
        />
      )}

      {deleteAccountOpen && (
        <ConfirmDialog
          title="Удалить аккаунт?"
          message={<>Вы точно хотите удалить аккаунт <b className="text-white">{user?.username}</b>? Журнал, оценки, отзывы, друзья и ваши общие списки удалятся навсегда. Это нельзя отменить.</>}
          confirmLabel="Удалить навсегда"
          icon="trash-2"
          busy={deleteBusy}
          error={deleteError}
          confirmDisabled={!deletePassword}
          onClose={() => setDeleteAccountOpen(false)}
          onConfirm={async () => {
            setDeleteBusy(true);
            setDeleteError("");
            const result = await deleteAccount(deletePassword);
            setDeleteBusy(false);
            if (!result.success) setDeleteError(result.error);
          }}
        >
          <label className="block">
            <span className="block text-[13px] font-bold text-[#b4b2bf] mb-2">Введите пароль для подтверждения</span>
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={INPUT}
              placeholder="Пароль"
            />
          </label>
        </ConfirmDialog>
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
        <div className="fixed inset-0 bg-mg-ink/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-mg-pop mg-pop-glass border border-white/10 rounded-[24px] max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-7 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
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
                  className="bg-mg-raised rounded-2xl p-4 text-center"
                >
                  <div className={`font-display text-3xl font-bold ${s.color}`}>
                    {s.n}
                  </div>
                  <div className="text-xs text-[#8f8d9b]">{s.label}</div>
                </div>
              ))}
            </div>

            {importResult.failed.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm text-red-300 mb-2">Не найдено:</h4>
                <div className="bg-mg-sunken rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
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
  const isAuthRoute = hash === LOGIN_HASH || hash === REGISTER_HASH;
  const needsVerification = Boolean(token && user && !user.isVerified);

  // После входа убираем #/login из адреса, чтобы он не остался в истории
  useEffect(() => {
    if (token && !needsVerification && isAuthRoute) leaveHashRoute();
  }, [token, needsVerification, isAuthRoute]);

  // Политика открывается и без входа, и по прямой ссылке
  if (hash === POLICY_HASH) return <PrivacyPolicy />;
  // Один и тот же экран для входа и подтверждения email: после регистрации
  // он не перемонтируется и не теряет шаг ввода кода
  if (needsVerification || (!token && isAuthRoute)) {
    return <AuthScreen initialLogin={hash !== REGISTER_HASH} />;
  }
  if (token) return <MovieTracker />;
  // Гость без хэша видит лендинг
  return <Landing />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
