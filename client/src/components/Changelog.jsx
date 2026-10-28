import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useScrollLock } from "../hooks/useScrollLock";
import { APP_VERSION, CHANGELOG } from "../changelog";
import { ORANGE_FILTER } from "./styles";

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

// Окно «Что нового»: версии сайта от новой к старой
export function ChangelogModal({ onClose }) {
  useScrollLock();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#04050c]/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        className="mg-tab-enter w-full sm:max-w-lg max-h-[85dvh] flex flex-col bg-[#12152a] border border-white/10 rounded-t-[24px] sm:rounded-[24px] shadow-[0_40px_120px_rgba(0,0,0,0.7)] safe-bottom"
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div>
            <h2 id="changelog-title" className="font-display text-xl font-semibold text-white">
              Что нового
            </h2>
            <p className="text-xs text-[#8b91b5] mt-0.5">Сейчас у вас версия {APP_VERSION}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="w-11 h-11 shrink-0 flex items-center justify-center bg-white/[0.07] hover:bg-white/[0.12] rounded-full"
          >
            <Icon n="x" className="w-5 h-5" />
          </button>
        </div>

        <ol className="overflow-y-auto px-6 py-5 space-y-6">
          {CHANGELOG.map((release, index) => (
            <li key={release.version} className="relative pl-6">
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full ${index === 0 ? "bg-[#ff7a45] shadow-[0_0_0_4px_rgba(255,122,69,0.18)]" : "bg-white/20"}`}
              />
              {index < CHANGELOG.length - 1 && (
                <span aria-hidden="true" className="absolute left-[4.5px] top-5 -bottom-6 w-px bg-white/[0.08]" />
              )}
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className={`text-xs font-extrabold ${index === 0 ? "text-[#ff935f]" : "text-[#aeb3d6]"}`}>
                  v{release.version}
                </span>
                <span className="text-xs text-[#6f759e]">{formatDate(release.date)}</span>
              </div>
              <h3 className="mt-1 font-bold text-white">{release.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {release.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-snug text-[#c4c8e4]">
                    <Icon n="check" className={`w-4 h-4 shrink-0 mt-0.5 ${index === 0 ? ORANGE_FILTER : "opacity-40"}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// Ненавязчивая подсказка после обновления сайта; сама скрывается через 12 секунд
export function UpdatedToast({ onOpen, onClose }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(onClose, 250);
    return () => clearTimeout(timer);
  }, [leaving, onClose]);

  return (
    <div
      role="status"
      className={`fixed z-50 left-3 right-3 mx-auto max-w-[420px] bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171b38]/95 backdrop-blur-xl p-3 pl-4 shadow-2xl shadow-black/50 transition-all duration-200 ${leaving ? "opacity-0 translate-y-2" : "mg-tab-enter"}`}
    >
      <span className="w-9 h-9 shrink-0 rounded-full bg-[#ff7a45]/15 flex items-center justify-center">
        <Icon n="sparkles" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} />
      </span>
      <div className="min-w-0 flex-1 text-sm leading-tight">
        <div className="font-bold text-white">Сайт обновлён до v{APP_VERSION}</div>
        <div className="text-[#8b91b5] text-xs mt-0.5 truncate">{CHANGELOG[0]?.title}</div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="h-9 px-3.5 shrink-0 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-[13px] font-bold text-white"
      >
        Что нового
      </button>
      <button
        type="button"
        onClick={() => setLeaving(true)}
        aria-label="Скрыть"
        className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-[#8b91b5] hover:text-white"
      >
        <Icon n="x" className="w-4 h-4" />
      </button>
    </div>
  );
}
