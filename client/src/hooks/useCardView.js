import { useSyncExternalStore } from "react";

// Вид карточек фильмов: "grid" — плитка с постерами, "list" — строки с описанием.
// Выбор хранится в браузере и общий для всех списков фильмов на сайте.
export const CARD_VIEWS = [
  { id: "grid", label: "Сетка", icon: "layout-grid" },
  { id: "list", label: "Список", icon: "list" },
];

const KEY = "mg-card-view";
const listeners = new Set();

const read = () => {
  try {
    const saved = localStorage.getItem(KEY);
    return CARD_VIEWS.some((v) => v.id === saved) ? saved : "grid";
  } catch {
    return "grid";
  }
};

let current = read();

export function setCardView(view) {
  current = view;
  try {
    localStorage.setItem(KEY, view);
  } catch {
    /* без хранилища выбор действует до перезагрузки */
  }
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useCardView = () => useSyncExternalStore(subscribe, () => current);
