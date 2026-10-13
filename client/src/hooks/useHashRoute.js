import { useEffect, useState } from "react";

// Минимальная маршрутизация по «#»: нужна, чтобы страница политики открывалась и без входа,
// и по прямой ссылке (например, из формы регистрации в новой вкладке).
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return hash;
}

// Возврат с отдельной страницы: убираем «#», не перезагружая приложение
export function leaveHashRoute() {
  window.history.pushState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
