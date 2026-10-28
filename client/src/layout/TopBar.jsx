import Icon from "../components/Icon";
import { Logo } from "../components/ui";
import { ORANGE_FILTER } from "../components/styles";
import { NotificationsBell } from "../components/Notifications";
import AccountMenu from "./AccountMenu";

// Верхняя полоска: логотип, разделы (на компьютере), уведомления и меню аккаунта
export default function TopBar({ items, activeSection, onNavigate, notifications, account }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0a0c18]/90 backdrop-blur-xl border-b border-white/[0.06] safe-top safe-x">
      <div className="flex items-center gap-2.5 sm:gap-3 px-4 lg:px-8 h-[72px] max-w-[1680px] mx-auto">
        <button type="button" onClick={() => onNavigate("home")} className="shrink-0 lg:mr-6" aria-label="На главную">
          <Logo />
        </button>

        <nav className="hidden lg:flex items-center gap-1 self-stretch min-w-0" aria-label="Разделы">
          {items.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                className={`relative shrink-0 h-full flex items-center gap-2 px-3.5 text-sm font-semibold transition-colors after:absolute after:left-3 after:right-3 after:-bottom-px after:h-[2px] after:rounded-full after:transition-colors ${
                  active
                    ? "text-[#ff935f] after:bg-[#ff7a45]"
                    : "text-[#9aa0c6] hover:text-white after:bg-transparent"
                }`}
              >
                <Icon n={item.icon} className={`w-[18px] h-[18px] ${active ? ORANGE_FILTER : "opacity-70"}`} />
                {item.label}
                {item.badge > 0 && (
                  <span
                    className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center"
                    aria-label={`Новых уведомлений: ${item.badge}`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <NotificationsBell {...notifications} />
        <AccountMenu onNavigate={onNavigate} {...account} />
      </div>
    </header>
  );
}
