import { useEffect } from "react";

// Пока окно открыто, страница под ним не прокручивается (на iPhone она иначе «ползёт»).
// Счётчик нужен, чтобы вложенные окна не снимали блокировку друг у друга.
let locks = 0;
let saved = "";

export function useScrollLock() {
  useEffect(() => {
    if (locks === 0) {
      saved = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = saved;
    };
  }, []);
}
