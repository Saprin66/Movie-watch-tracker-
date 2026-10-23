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

export const Grid = ({ children }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6">
    {children}
  </div>
);

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

// Логотип: оранжевый квадрат с кнопкой «play» и надпись
export const Logo = ({ size = "md", showText = true }) => {
  const box = size === "lg" ? "w-10 h-10 rounded-xl" : "w-9 h-9 rounded-[11px]";
  const txt = size === "lg" ? "text-xl" : "text-lg";
  return (
    <div className="flex items-center gap-3">
      <div className={`${box} bg-[#ff7a45] flex items-center justify-center shrink-0`}>
        <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" aria-hidden="true">
          <path d="M7 4.5v15l13-7.5z" fill="#1b0d07" />
        </svg>
      </div>
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

// Стеклянный переключатель подразделов с подсветкой, которая переезжает к выбранному
export function SubTabs({ items, active, onChange }) {
  const index = Math.max(items.findIndex((t) => t.id === active), 0);
  return (
    <div className="mb-6 flex justify-center sm:justify-start">
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
              className={`relative flex-1 sm:flex-none sm:w-[150px] h-10 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-sm font-bold transition-colors duration-300 ${
                selected ? "text-[#ffb08c]" : "text-[#aeb3d6] hover:text-white"
              }`}
            >
              {t.label}
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
