import { useEffect, useRef, useState } from "react";

// Длительность анимации закрытия страницы, мс (совпадает с .mg-page-leave в index.css)
export const LEAVE_MS = 260;

// Полноэкранная страница поверх приложения добавляет запись в историю браузера:
// системная кнопка/жест «Назад» закрывает её, а не уводит с сайта.
// key отличает страницы друг от друга (например, «details» и «review»).
export function useBackClose(key, onClose) {
  const [leaving, setLeaving] = useState(false);

  // Свежий onClose без переподписки на события
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (window.history.state?.mgPage !== key) {
      window.history.pushState({ ...window.history.state, mgPage: key }, "");
    }
    let timer;
    const onPop = () => {
      // Запись этой страницы всё ещё текущая — «назад» был не про неё
      if (window.history.state?.mgPage === key) return;
      setLeaving(true);
      timer = setTimeout(() => onCloseRef.current(), LEAVE_MS);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      clearTimeout(timer);
    };
  }, [key]);

  // Закрыть с анимацией через шаг «назад» по истории
  const close = () => {
    if (window.history.state?.mgPage === key) window.history.back();
    else onCloseRef.current();
  };

  // Закрыться, отдав свою запись в истории следующей странице (без шага «назад»,
  // который иначе закрыл бы и только что открытую страницу)
  const handOver = (nextKey) => {
    if (window.history.state?.mgPage === key) {
      window.history.replaceState({ ...window.history.state, mgPage: nextKey }, "");
    }
    onCloseRef.current();
  };

  return { leaving, close, handOver };
}
