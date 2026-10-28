import { useEffect, useRef, useState } from "react";
import { TMDB, TMDB_API_KEY } from "../config";
import { fetchTranslatedPage } from "../utils/tmdb";

const NO_KEY_ERROR =
  "На сайте не настроен ключ TMDB. Добавьте VITE_TMDB_API_KEY в переменные окружения хостинга и пересоберите проект.";

// Каталог TMDB во вкладке «Искать»: поиск по названию, подбор по фильтрам
// и популярное. Состояние живёт в App, чтобы не сбрасываться при смене вкладки.
// active — открыта ли сейчас вкладка поиска.
export function useCatalog({ active }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchMode, setSearchMode] = useState("text");
  const [catalogType, setCatalogType] = useState("movie");
  const [catalogGenres, setCatalogGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // На телефоне фильтры свёрнуты, чтобы сразу были видны результаты поиска
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try {
      return window.matchMedia("(min-width: 1024px)").matches;
    } catch {
      return true;
    }
  });

  // Номер последнего запроса: запоздавший ответ на старый запрос не перезапишет свежий
  const searchSeq = useRef(0);
  const searchTimer = useRef(null);
  const inputRef = useRef(null);

  const loadPopular = async (nextPage = 1) => {
    const seq = ++searchSeq.current;
    if (!TMDB_API_KEY) {
      setError(NO_KEY_ERROR);
      return;
    }
    try {
      // Только фильмы с русским переводом: без них в «популярном» попадается экзотика
      const { results, totalPages: total } = await fetchTranslatedPage(
        (p) => `${TMDB}/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU&page=${p}`,
        nextPage,
      );
      if (seq !== searchSeq.current) return;
      setSearchResults(results);
      setPage(nextPage);
      setTotalPages(total);
      setError("");
    } catch (err) {
      if (seq !== searchSeq.current) return;
      console.error("Ошибка загрузки популярных фильмов:", err);
      setError(err.message || "Ошибка соединения с TMDB");
    }
  };

  const search = async (query, nextPage = 1) => {
    clearTimeout(searchTimer.current);
    setSearchMode("text");
    setError("");
    const seq = ++searchSeq.current;

    if (!query.trim()) {
      loadPopular(nextPage);
      return;
    }
    try {
      const res = await fetch(
        `${TMDB}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ru-RU&page=${nextPage}`,
      );
      const data = await res.json();
      if (seq !== searchSeq.current) return;
      setSearchResults((data.results || []).filter((r) => r.media_type !== "person"));
      setPage(nextPage);
      setTotalPages(Math.min(data.total_pages || 1, 500));
    } catch (err) {
      console.error("Ошибка поиска:", err);
    }
  };

  const discover = async (nextPage = 1) => {
    const seq = ++searchSeq.current;
    setLoading(true);
    setError("");
    setSearchMode("filters");
    setPage(nextPage);
    if (!TMDB_API_KEY) {
      setError(NO_KEY_ERROR);
      setSearchResults([]);
      setLoading(false);
      return;
    }
    const fromYear = yearFrom.trim();
    const toYear = yearTo.trim();
    if ((fromYear && !/^\d{4}$/.test(fromYear)) || (toYear && !/^\d{4}$/.test(toYear))) {
      setError("Укажи год четырьмя цифрами, например 2000.");
      setLoading(false);
      return;
    }
    if (fromYear && toYear && Number(fromYear) > Number(toYear)) {
      setError("Год «от» не может быть больше года «до».");
      setLoading(false);
      return;
    }
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: "ru-RU",
      sort_by: sortBy,
      "vote_count.gte": "10",
    });
    if (selectedGenres.length) params.set("with_genres", selectedGenres.join(","));
    if (minRating !== "0") params.set("vote_average.gte", minRating);
    if (yearFrom) params.set(catalogType === "tv" ? "first_air_date.gte" : "primary_release_date.gte", `${yearFrom}-01-01`);
    if (yearTo) params.set(catalogType === "tv" ? "first_air_date.lte" : "primary_release_date.lte", `${yearTo}-12-31`);
    try {
      // В подборке по фильтрам — только переведённое на русский.
      // Поиск по названию находит всё, этот отсев его не касается.
      const { results, totalPages: total } = await fetchTranslatedPage((p) => {
        params.set("page", String(p));
        return `${TMDB}/discover/${catalogType}?${params.toString()}`;
      }, nextPage);
      if (seq !== searchSeq.current) return;
      setSearchResults(results.map((item) => ({ ...item, media_type: catalogType })));
      setTotalPages(total);
    } catch (err) {
      if (seq !== searchSeq.current) return;
      console.error("Ошибка подбора по фильтрам:", err);
      setError(err.message || "Ошибка соединения с TMDB. Проверьте ключ API и настройки сайта.");
      setSearchResults([]);
    } finally {
      if (seq === searchSeq.current) setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedGenres([]);
    setYearFrom("");
    setYearTo("");
    setMinRating("0");
    setSortBy("popularity.desc");
    // После сброса снова показываем популярное вместо старой подборки
    if (searchMode === "filters") search(searchQuery);
  };

  // Переход на другую страницу результатов в текущем режиме поиска
  const goToPage = (nextPage) => {
    if (searchMode === "filters") discover(nextPage);
    else search(searchQuery, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Поиск при вводе: запрос уходит, когда человек на мгновение остановился
  const changeQuery = (query) => {
    setSearchQuery(query);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => search(query), 350);
  };

  const changeType = (type) => {
    setCatalogType(type);
    setSelectedGenres([]);
  };

  const toggleGenre = (id) =>
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // Популярное, пока нет запроса; не загружаем его поверх результатов фильтров
  useEffect(() => {
    // Загрузка с сервера: состояние меняется уже после ответа
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active && !searchQuery.trim() && searchMode !== "filters") loadPopular();
  }, [active, searchQuery, searchMode]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${TMDB}/genre/${catalogType}/list?api_key=${TMDB_API_KEY}&language=ru-RU`)
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить жанры TMDB");
        return res.json();
      })
      .then((data) => !cancelled && setCatalogGenres(data.genres || []))
      .catch((err) => !cancelled && setError(err.message || "Не удалось загрузить жанры"));
    return () => {
      cancelled = true;
    };
  }, [catalogType]);

  return {
    inputRef,
    searchQuery,
    changeQuery,
    search,
    searchResults,
    searchMode,
    catalogType,
    changeType,
    catalogGenres,
    selectedGenres,
    toggleGenre,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    minRating,
    setMinRating,
    sortBy,
    setSortBy,
    page,
    totalPages,
    loading,
    error,
    filtersOpen,
    setFiltersOpen,
    discover,
    resetFilters,
    goToPage,
  };
}
