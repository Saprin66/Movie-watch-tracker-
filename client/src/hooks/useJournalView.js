import { useState } from "react";
import { SORT_OPTIONS } from "../utils/sortMovies";
import { DEFAULT_FILTERS } from "../utils/filterMovies";

// Что показано в «Моём журнале»: статус, фильтры и сортировка.
// Живёт в App, чтобы выбор не сбрасывался при переходе между вкладками.
export function useJournalView() {
  const [status, setStatus] = useState("watched");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
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

  return { status, setStatus, filters, setFilters, sortMode, changeSort };
}
