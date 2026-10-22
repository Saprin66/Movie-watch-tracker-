// Фильтры списка «Мой список»: поиск по названию, тип, жанр, десятилетие, оценка.

export const DEFAULT_FILTERS = {
  query: "",
  kind: "all", // all | movie | tv
  genre: "", // название жанра или пусто
  decade: "", // "2010" значит 2010-е, пусто значит любое
  rating: "any", // any | 9 | 8 | 7 | 6 | none
};

export const KIND_OPTIONS = [
  { id: "all", label: "Всё" },
  { id: "movie", label: "Фильмы" },
  { id: "tv", label: "Сериалы" },
];

export const RATING_OPTIONS = [
  { id: "any", label: "Любая оценка" },
  { id: "9", label: "9 и выше" },
  { id: "8", label: "8 и выше" },
  { id: "7", label: "7 и выше" },
  { id: "6", label: "6 и выше" },
  { id: "none", label: "Без оценки" },
];

// Регистр и «ё» не мешают поиску
const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim();

export const decadeOf = (year) =>
  Number.isInteger(year) && year > 0 ? Math.floor(year / 10) * 10 : null;

export function filterMovies(list, filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const query = normalize(f.query);

  return list.filter((movie) => {
    if (query && !normalize(movie.title).includes(query)) return false;

    if (f.kind !== "all") {
      const type = movie.mediaType === "tv" ? "tv" : "movie";
      if (type !== f.kind) return false;
    }

    if (f.genre && !(movie.genres || []).includes(f.genre)) return false;

    if (f.decade && decadeOf(movie.releaseYear) !== Number(f.decade)) {
      return false;
    }

    if (f.rating === "none") {
      if (movie.rating) return false;
    } else if (f.rating !== "any") {
      if (!movie.rating || movie.rating < Number(f.rating)) return false;
    }

    return true;
  });
}

// Сколько фильтров включено (поиск по названию не считается: он виден сам)
export function countActiveFilters(filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  return [
    f.kind !== "all",
    Boolean(f.genre),
    Boolean(f.decade),
    f.rating !== "any",
  ].filter(Boolean).length;
}

export const isFiltering = (filters) =>
  countActiveFilters(filters) > 0 || normalize(filters.query) !== "";

// Жанры и десятилетия, которые реально есть в списке, с количеством записей
export function collectFacets(list) {
  const genres = new Map();
  const decades = new Map();

  for (const movie of list) {
    for (const genre of movie.genres || []) {
      genres.set(genre, (genres.get(genre) || 0) + 1);
    }
    const decade = decadeOf(movie.releaseYear);
    if (decade) decades.set(decade, (decades.get(decade) || 0) + 1);
  }

  return {
    genres: [...genres.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru")),
    decades: [...decades.entries()]
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => b.decade - a.decade),
  };
}
