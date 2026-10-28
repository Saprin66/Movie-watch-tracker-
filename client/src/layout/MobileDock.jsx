import Icon from "../components/Icon";
import { ORANGE_FILTER } from "../components/styles";

// Нижний док на телефоне: панель разделов и отдельная кнопка поиска справа
export default function MobileDock({ items, activeSection, searchActive, onNavigate, onSearch }) {
  const index = items.findIndex((item) => item.id === activeSection);

  return (
    <div className="mg-dock-bottom lg:hidden fixed z-40 left-3 right-3 mx-auto max-w-[480px] flex items-stretch gap-2">
      <nav aria-label="Разделы" className="mg-glass-nav flex-1 min-w-0 rounded-full p-1.5">
        <div className="relative flex">
          {/* Подсветка активной вкладки плавно переезжает между пунктами */}
          <span
            aria-hidden="true"
            className="mg-glass-pill absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${100 / items.length}%`,
              transform: `translateX(${Math.max(index, 0) * 100}%)`,
              opacity: index < 0 ? 0 : 1,
            }}
          />
          {items.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                className="relative flex-1 min-w-0 min-h-[52px] flex flex-col items-center justify-center gap-1 px-0 rounded-full active:scale-90 transition-transform duration-200"
              >
                <span key={active ? "on" : "off"} className={`relative ${active ? "mg-nav-pop" : ""}`}>
                  <Icon
                    n={item.icon}
                    className={`w-[22px] h-[22px] transition-opacity duration-300 ${active ? ORANGE_FILTER : "opacity-60"}`}
                  />
                  {item.badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[10px] font-extrabold leading-none flex items-center justify-center"
                      aria-label={`Новых уведомлений: ${item.badge}`}
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={`max-w-full truncate text-[10px] font-semibold tracking-[-0.01em] transition-colors duration-300 ${active ? "text-[#ff935f]" : "text-[#aeb3d6]/70"}`}
                >
                  {item.short ?? item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      <button
        type="button"
        onClick={onSearch}
        aria-label="Поиск"
        aria-current={searchActive ? "page" : undefined}
        className={`mg-glass-nav shrink-0 w-16 rounded-full flex items-center justify-center transition-transform active:scale-90 ${searchActive ? "mg-glass-nav--active" : ""}`}
      >
        <Icon n="search" className={`w-6 h-6 ${searchActive ? ORANGE_FILTER : ""}`} />
      </button>
    </div>
  );
}
