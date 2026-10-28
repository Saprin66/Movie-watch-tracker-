import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { Avatar } from "../components/ui";
import { CONTACT_EMAIL } from "../legal";

const ITEM =
  "w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#c4c8e4] hover:bg-white/[0.06] hover:text-white text-left transition-colors";

const Badge = ({ children }) => (
  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center">
    {children}
  </span>
);

// Аватарка в шапке и выпадающее меню аккаунта.
// hasNews — точка на аватарке и метка «Новое» у пункта «Что нового».
export default function AccountMenu({ user, requestsCount, hasNews, onNavigate, onOpenChangelog, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const go = (tab) => {
    setOpen(false);
    onNavigate(tab);
  };

  return (
    <div className="relative flex items-center shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={hasNews ? "Открыть меню аккаунта (есть новое)" : "Открыть меню аккаунта"}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative rounded-full outline-none ring-offset-2 ring-offset-[#0a0c18] focus-visible:ring-2 focus-visible:ring-[#ff7a45]"
      >
        <Avatar name={user?.username} avatar={user?.avatar} size="w-11 h-11" />
        {hasNews && (
          <span aria-hidden="true" className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#ff7a45] border-2 border-[#0a0c18]" />
        )}
      </button>
      {open && (
        <div role="menu" aria-label="Меню аккаунта" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#12152a] p-2 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-3 py-3 mb-1">
            <Avatar name={user?.username} avatar={user?.avatar} size="w-11 h-11" text="text-base" />
            <div className="min-w-0">
              <div className="font-extrabold text-white truncate">{user?.username}</div>
              <div className="text-xs text-[#8b91b5] truncate">{user?.email}</div>
            </div>
          </div>
          <button role="menuitem" onClick={() => go("profile")} className={ITEM}>
            <Icon n="user-round" className="w-4 h-4" /> Профиль
          </button>
          <button role="menuitem" onClick={() => go("friends")} className={`lg:hidden ${ITEM}`}>
            <Icon n="users" className="w-4 h-4" /> Друзья
            {requestsCount > 0 && <Badge>{requestsCount}</Badge>}
          </button>
          <button role="menuitem" onClick={() => go("profile-settings")} className={ITEM}>
            <Icon n="settings" className="w-4 h-4" /> Настройки профиля
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenChangelog();
            }}
            className={ITEM}
          >
            <Icon n="sparkles" className="w-4 h-4" /> Что нового
            {hasNews && <Badge>Новое</Badge>}
          </button>
          <a role="menuitem" href={`mailto:${CONTACT_EMAIL}`} onClick={() => setOpen(false)} className={ITEM}>
            <Icon n="life-buoy" className="w-4 h-4" /> Поддержка
          </a>
          <div className="my-1 border-t border-white/[0.08]" />
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 text-left transition-colors"
          >
            <Icon n="log-out" className="w-4 h-4" /> Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  );
}
