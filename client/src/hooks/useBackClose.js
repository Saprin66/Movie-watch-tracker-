import { useEffect, useRef, useState } from "react";

// Длительность анимации закрытия страницы, мс (совпадает с .mg-page-leave в index.css)
export const LEAVE_MS = 260;

// Событие «открылась новая страница»: pushState сам событий не шлёт
const PAGES_EVENT = "mg-pages-change";

// Полноэкранная страница поверх приложения добавляет запись в историю браузера:
// системная кнопка/жест «Назад» закрывает её, а не уводит с сайта.
// key отличает страницы друг от друга (например, «details» и «review»).
// Страницы могут лежать стопкой: каждая помнит свою глубину (mgDepth) и закрывается,
// только когда «назад» ушёл ниже неё, — нижние страницы при этом остаются.
// covered: поверх открыта другая страница — нижнюю можно не рисовать (см. .mg-page-covered).
export function useBackClose(key, onClose) {
  const [leaving, setLeaving] = useState(false);
  const [covered, setCovered] = useState(false);

  // Свежий onClose без переподписки на события
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const state = window.history.state;
    let depth;
    if (state?.mgPage === key) {
      // Запись уже есть: повторный запуск эффекта или её передали через handOver
      depth = state.mgDepth ?? 1;
    } else {
      depth = (state?.mgDepth ?? 0) + 1;
      window.history.pushState({ ...state, mgPage: key, mgDepth: depth }, "");
    }
    let timer;
    const syncCovered = () => setCovered((window.history.state?.mgDepth ?? 0) > depth);
    const onPop = () => {
      // «Назад» снял страницу выше этой — эта остаётся и снова видна
      if ((window.history.state?.mgDepth ?? 0) >= depth) {
        syncCovered();
        return;
      }
      setLeaving(true);
      timer = setTimeout(() => onCloseRef.current(), LEAVE_MS);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener(PAGES_EVENT, syncCovered);
    // Сообщаем нижним страницам, что их накрыли
    window.dispatchEvent(new Event(PAGES_EVENT));
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener(PAGES_EVENT, syncCovered);
      clearTimeout(timer);
    };
  }, [key]);

  // Закрыть с анимацией через шаг «назад» по истории
  const close = () => {
    // Накрытая страница не закрывается сама (например, по Esc для верхней)
    if (covered) return;
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

  return { leaving, covered, close, handOver };
}
