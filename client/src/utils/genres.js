// Названия жанров TMDB по id (фильмы и сериалы). Одинаковые названия у новых и у
// дозаполненных записей нужны, чтобы фильтр по жанру не раздваивался.
const GENRE_NAMES = {
  28: "Боевик",
  12: "Приключения",
  16: "Мультфильм",
  35: "Комедия",
  80: "Криминал",
  99: "Документальный",
  18: "Драма",
  10751: "Семейный",
  14: "Фэнтези",
  36: "История",
  27: "Ужасы",
  10402: "Музыка",
  9648: "Детектив",
  10749: "Мелодрама",
  878: "Фантастика",
  10770: "Телефильм",
  53: "Триллер",
  10752: "Военный",
  37: "Вестерн",
  // только сериалы
  10759: "Боевик и приключения",
  10762: "Детский",
  10763: "Новости",
  10764: "Реалити-шоу",
  10765: "Фантастика и фэнтези",
  10766: "Мыльная опера",
  10767: "Ток-шоу",
  10768: "Война и политика",
};

const capitalize = (text) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

export function genreName(id, fallbackName) {
  return GENRE_NAMES[id] || capitalize(fallbackName) || null;
}

const yearOf = (date) => {
  const year = parseInt(String(date || "").slice(0, 4), 10);
  return Number.isInteger(year) && year >= 1870 && year <= 2100 ? year : null;
};

// Год и жанры из ответа TMDB: результат поиска (genre_ids) или карточка (genres)
export function metaFromTmdb(item) {
  if (!item) return { releaseYear: null, genres: [] };

  const names = Array.isArray(item.genres)
    ? item.genres.map((g) => genreName(g.id, g.name))
    : Array.isArray(item.genre_ids)
      ? item.genre_ids.map((id) => genreName(id))
      : [];

  return {
    releaseYear: yearOf(item.release_date || item.first_air_date),
    genres: [...new Set(names.filter(Boolean))],
  };
}
