import { useId } from "react";
import { PANEL } from "./styles";
import Icon from "./Icon";

export function Chip({ children, tone = "soft" }) {
  const tones = {
    soft: "bg-white/[0.07] text-[#aeb3d6]",
    orange: "bg-[#ff7a45]/[0.16] text-[#ff9a6c]",
    green: "bg-emerald-400/[0.14] text-[#58dcaa]",
    blue: "bg-sky-400/[0.15] text-[#86b8ff]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// Детерминированный оттенок по строке: у каждого фильма свой цвет заглушки
const hueOf = (text = "") => {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
};

// Заглушка постера: градиент и название, если картинки нет
export function PosterFallback({ title, className = "", small = false }) {
  const h1 = hueOf(title);
  const h2 = (h1 + 40) % 360;
  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{
        background: `radial-gradient(110% 60% at 15% 0%, hsla(${h1},90%,60%,.5), transparent 62%), linear-gradient(165deg, hsl(${h1},45%,20%), hsl(${h2},55%,8%))`,
      }}
    >
      {!small && (
        <span className="absolute left-2.5 right-2.5 bottom-3 font-display font-bold text-[12px] leading-tight text-white line-clamp-3">
          {title}
        </span>
      )}
    </div>
  );
}

export function Poster({ src, title, className = "", small = false }) {
  return src ? (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className={`w-full h-full object-cover ${className}`}
    />
  ) : (
    <PosterFallback title={title} className={className} small={small} />
  );
}

// Маленькая круглая кнопка из «жидкого стекла» в углу постера.
// Без настоящего размытия (mg-glass-btn--flat): на длинном списке сотни размытых
// слоёв заставляли Safari на iPhone тормозить при прокрутке.
// active: стекло подкрашивается цветом, когда статус уже выставлен
export function CornerButton({ icon, label, active, tone = "orange", onClick }) {
  const activeTones = {
    orange: "mg-glass-btn--orange",
    green: "mg-glass-btn--green",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`mg-glass-btn mg-glass-btn--flat ${active ? activeTones[tone] : ""} relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']`}
    >
      <Icon
        n={icon}
        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
      />
    </button>
  );
}

export function MovieCard({ poster, title, chips, footerLeft, actions, onClick, topLeft, topRight }) {
  const hasCorners = topLeft || topRight;
  return (
    <div className="group relative min-w-0">
      <div
        className="relative aspect-[2/3] cursor-pointer overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#1d2140] shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#ff7a45]/50 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
        onClick={onClick}
      >
        <Poster src={poster} title={title} />
        {/* С кнопками в углах чипы уезжают вниз постера, чтобы не перекрываться */}
        <div className={`absolute left-2 right-2 flex flex-wrap gap-1 [&>span]:bg-[#080a16]/85 [&>span]:px-2 [&>span]:py-0.5 [&>span]:text-[10px] [&>span]:rounded-lg ${hasCorners ? "bottom-2 items-end" : "top-2 items-start"}`}>
          {chips}
        </div>
        {topLeft && <div className="absolute top-1.5 left-1.5">{topLeft}</div>}
        {topRight && <div className="absolute top-1.5 right-1.5">{topRight}</div>}
        {actions && (
          <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
            {actions}
          </div>
        )}
      </div>
      <div className="pt-2.5 px-0.5">
        <div
          className="text-[13px] font-bold text-white truncate cursor-pointer"
          title={title}
          onClick={onClick}
        >
          {title}
        </div>
        {footerLeft && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-[#8b91b5] truncate">
            {footerLeft}
          </div>
        )}
      </div>
    </div>
  );
}

// withSidebar: сетка стоит рядом с панелью фильтров, поэтому колонок меньше
export const Grid = ({ children, withSidebar = false }) => (
  <div
    className={`grid grid-cols-3 sm:grid-cols-4 ${
      withSidebar ? "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" : "lg:grid-cols-5 2xl:grid-cols-6"
    } gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6`}
  >
    {children}
  </div>
);

// Номера страниц вокруг текущей: 1 … 4 5 6 … 20
const pageList = (page, total) => {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(`gap-${p}`);
    result.push(p);
  });
  return result;
};

export function Pagination({ page, totalPages, onChange, disabled = false }) {
  if (totalPages <= 1) return null;
  const btn =
    "min-w-[44px] h-11 px-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none";
  const soft = "bg-white/[0.07] hover:bg-white/[0.12] text-[#e9ebf7]";
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-2" aria-label="Страницы">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Предыдущая страница"
        className={`${btn} ${soft}`}
      >
        ←
      </button>
      {pageList(page, totalPages).map((p) =>
        typeof p === "string" ? (
          <span key={p} className="px-1 text-[#6f759e]">…</span>
        ) : (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => p !== page && onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${btn} ${p === page ? "bg-[#ff7a45] text-[#1b0d07]" : soft}`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Следующая страница"
        className={`${btn} ${soft}`}
      >
        →
      </button>
    </nav>
  );
}

export const Empty = ({ text }) => (
  <div className={`${PANEL} text-center py-16 px-6 text-[#8b91b5]`}>{text}</div>
);

export const Avatar = ({ name, avatar, size = "w-10 h-10", text = "text-sm" }) => (
  <div
    className={`${size} ${text} rounded-full bg-gradient-to-br from-[#ff7a45] to-[#8b5cf6] flex items-center justify-center font-extrabold text-white shrink-0 overflow-hidden`}
  >
    {avatar ? (
      <img
        src={avatar}
        alt={`${name || "Пользователь"} — аватар`}
        className="w-full h-full object-cover"
      />
    ) : (
      name?.[0]?.toUpperCase() || "U"
    )}
  </div>
);

// Знак MovieGrade: стеклянный билет с буквой M и звездой оценки
const TICKET = "M10 14H54a4 4 0 0 1 4 4V27a5 5 0 0 0 0 10V46a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V37a5 5 0 0 0 0-10V18a4 4 0 0 1 4-4Z";

export const LogoMark = ({ className = "w-10 h-10" }) => {
  // id у svg-фильтров должны быть уникальны, если логотипов на странице несколько
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={`${className} shrink-0 overflow-visible`} aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}><path d={TICKET} /></clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".15" />
          <stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
        <filter id={`${id}b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <circle cx="22" cy="24" r="13" fill="#ff7a45" filter={`url(#${id}b)`} />
      <circle cx="44" cy="40" r="12" fill="#E8577A" filter={`url(#${id}b)`} />
      <path d={TICKET} fill="#fff" fillOpacity=".16" />
      <g clipPath={`url(#${id}c)`}><rect y="14" width="64" height="14" fill={`url(#${id}g)`} opacity=".7" /></g>
      <path d={TICKET} fill="none" stroke={`url(#${id}e)`} strokeWidth="1.2" />
      <polyline points="15,41 15,23 25.5,34 36,23 36,41" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="43" y1="18" x2="43" y2="46" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" strokeDasharray="2.2 2.6" strokeLinecap="round" />
      <polygon points="51,27 52.29,30.22 55.76,30.45 53.09,32.68 53.94,36.05 51,34.2 48.06,36.05 48.91,32.68 46.24,30.45 49.71,30.22" fill="#F2B35B" />
    </svg>
  );
};

// Логотип: стеклянный билет и надпись
export const Logo = ({ size = "md", showText = true }) => {
  const mark = size === "lg" ? "w-12 h-12" : "w-10 h-10";
  const txt = size === "lg" ? "text-xl" : "text-lg";
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className={mark} />
      {showText && (
        <span className={`font-display ${txt} font-bold text-white`}>
          Movie<span className="text-[#ff7a45]">Grade</span>
        </span>
      )}
    </div>
  );
};

// Горизонтальная лента карточек
export const Row = ({ children }) => (
  <div className="no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0 flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x">
    {children}
  </div>
);

// Стеклянный переключатель с подсветкой, которая переезжает к выбранному.
// className — обёртка, itemClass — ширина кнопок (на компьютере все одинаковые,
// иначе подсветка не совпадёт с кнопкой). count — тихий счётчик, badge — оранжевый.
export function SubTabs({
  items,
  active,
  onChange,
  className = "mb-6 flex justify-center",
  itemClass = "sm:w-[150px]",
}) {
  const index = Math.max(items.findIndex((t) => t.id === active), 0);
  return (
    <div className={className}>
      <div className="mg-glass-nav relative flex w-full sm:w-auto rounded-full p-1" role="tablist">
        <span
          aria-hidden="true"
          className="mg-glass-pill absolute inset-y-1 left-1 rounded-full"
          style={{
            width: `calc((100% - 0.5rem) / ${items.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {items.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(t.id)}
              className={`relative flex-1 sm:flex-none ${itemClass} h-10 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-sm font-bold transition-colors duration-300 ${
                selected ? "text-[#ffb08c]" : "text-[#aeb3d6] hover:text-white"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="text-xs font-bold opacity-60">{t.count}</span>
              )}
              {t.badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[10px] font-extrabold leading-none flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
