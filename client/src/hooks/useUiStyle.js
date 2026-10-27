import { useEffect, useState } from "react";

// Стиль интерфейса выбирается отдельно для компьютера и телефона:
// "glass" — жидкое стекло, "plain" — обычные сплошные панели.
// Выбор хранится в браузере и применяется атрибутом data-ui на <html>.
export const UI_STYLES = [
  { id: "plain", label: "Обычный" },
  { id: "glass", label: "Жидкое стекло" },
];

const DEFAULTS = { desktop: "plain", mobile: "glass" };
const KEY = { desktop: "mg-ui-desktop", mobile: "mg-ui-mobile" };
const DESKTOP_QUERY = "(min-width: 1024px)";
const CHANGE_EVENT = "moviegrade:ui-style";

const read = (device) => {
  try {
    const saved = localStorage.getItem(KEY[device]);
    return UI_STYLES.some((s) => s.id === saved) ? saved : DEFAULTS[device];
  } catch {
    return DEFAULTS[device];
  }
};

const isDesktop = () => {
  try {
    return window.matchMedia(DESKTOP_QUERY).matches;
  } catch {
    return true;
  }
};

export const applyUiStyle = () => {
  document.documentElement.dataset.ui = read(isDesktop() ? "desktop" : "mobile");
};

// Применяем сразу при загрузке модуля, чтобы не было мигания стилей
applyUiStyle();
try {
  window.matchMedia(DESKTOP_QUERY).addEventListener("change", applyUiStyle);
} catch {
  /* старые браузеры: стиль обновится после перезагрузки */
}

export function useUiStyle() {
  const [styles, setStyles] = useState(() => ({
    desktop: read("desktop"),
    mobile: read("mobile"),
  }));

  useEffect(() => {
    const sync = () => setStyles({ desktop: read("desktop"), mobile: read("mobile") });
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const setStyle = (device, style) => {
    try {
      localStorage.setItem(KEY[device], style);
    } catch {
      /* без хранилища выбор действует до перезагрузки */
    }
    setStyles((prev) => ({ ...prev, [device]: style }));
    if ((device === "desktop") === isDesktop()) {
      document.documentElement.dataset.ui = style;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { styles, setStyle };
}
