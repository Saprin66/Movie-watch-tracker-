import { useEffect, useRef } from "react";
import Icon from "./Icon";
import { BTN_SOFT } from "./styles";
import { useScrollLock } from "../hooks/useScrollLock";

// Окно подтверждения опасного действия: «Вы точно хотите…?»
// children — дополнительное содержимое (например, поле пароля).
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  icon = "triangle-alert",
  busy = false,
  error = "",
  confirmDisabled = false,
  onConfirm,
  onClose,
  children,
}) {
  useScrollLock();
  const cancelRef = useRef(null);

  // Свежие значения для обработчика клавиш без переподписки
  const latest = useRef({ busy, onClose });
  latest.current = { busy, onClose };

  useEffect(() => {
    // Фокус на «Отмена» один раз при открытии (если внутри нет своего поля с autoFocus):
    // случайный Enter ничего не удалит
    if (!document.activeElement?.closest?.("[data-confirm-dialog]")) {
      cancelRef.current?.focus();
    }
    const onKey = (e) => {
      if (e.key === "Escape" && !latest.current.busy) {
        e.stopPropagation();
        latest.current.onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-mg-ink/80 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        if (!busy) onClose();
      }}
    >
      <form
        data-confirm-dialog
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && !confirmDisabled) onConfirm();
        }}
        className="w-full sm:max-w-[440px] bg-mg-pop mg-pop-glass border border-white/10 rounded-t-[26px] sm:rounded-[24px] p-6 sm:p-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
      >
        <div className="w-12 h-12 rounded-2xl bg-red-400/[0.14] flex items-center justify-center mb-5">
          <Icon
            n={icon}
            className="w-6 h-6 [filter:invert(1)_sepia(1)_saturate(5)_hue-rotate(310deg)_brightness(1.1)]"
          />
        </div>
        <h2 id="confirm-title" className="font-display text-xl font-semibold text-white">
          {title}
        </h2>
        <div id="confirm-message" className="mt-2.5 text-sm leading-relaxed text-[#b4b2bf]">
          {message}
        </div>

        {children && <div className="mt-5">{children}</div>}

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`flex-1 h-12 rounded-xl text-sm ${BTN_SOFT} disabled:opacity-50`}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={busy || confirmDisabled}
            className="flex-1 h-12 rounded-xl text-sm font-extrabold bg-red-500 hover:bg-red-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "Подождите…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
