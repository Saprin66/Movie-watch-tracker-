export const SORT_OPTIONS = [
  { id: "added", label: "Сначала новые" },
  { id: "watched", label: "Недавно просмотренные" },
  { id: "rating", label: "По оценке" },
  { id: "title", label: "По названию" },
];

const time = (value) => {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

// Возвращает новый отсортированный массив, исходный не меняется
export function sortMovies(list, mode) {
  const copy = [...list];
  const byAdded = (a, b) => time(b.createdAt) - time(a.createdAt);

  switch (mode) {
    case "watched":
      // Просмотренные по дате просмотра, затем остальные по дате добавления
      return copy.sort((a, b) => {
        const aWatched = a.status === "WATCHED";
        const bWatched = b.status === "WATCHED";
        if (aWatched !== bWatched) return aWatched ? -1 : 1;
        if (!aWatched) return byAdded(a, b);
        return (
          time(b.watchedAt || b.updatedAt) - time(a.watchedAt || a.updatedAt) ||
          byAdded(a, b)
        );
      });
    case "rating":
      // Без оценки в конце
      return copy.sort(
        (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byAdded(a, b),
      );
    case "title":
      return copy.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", "ru", {
          sensitivity: "base",
        }),
      );
    default:
      return copy.sort(byAdded);
  }
}
