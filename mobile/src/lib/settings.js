import { useEffect, useState } from "react";
import { storage } from "./storage";

// Небольшие настройки, которые запоминаются между запусками (регион, сортировка)
export function useSetting(key, fallback) {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    storage.get(key)
      .then((saved) => saved && setValue(saved))
      .catch(() => {});
  }, [key]);

  const update = (next) => {
    setValue(next);
    storage.set(key, next).catch(() => {});
  };

  return [value, update];
}
