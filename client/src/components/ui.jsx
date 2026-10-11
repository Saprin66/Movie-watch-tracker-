import Icon from "./Icon";
import { PANEL } from "./styles";

export function Chip({ children, tone = "soft" }) {
  const tones = {
    soft: "bg-white/5 text-[#9aa0c8]",
    orange: "bg-[#f47c4f]/15 text-[#f47c4f]",
    green: "bg-emerald-500/15 text-emerald-300",
    blue: "bg-sky-500/15 text-sky-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function MovieCard({ poster, title, chips, footerLeft, actions, onClick }) {
  return (
    <div className="group relative bg-[#1c2040] border border-white/5 rounded-xl overflow-hidden transition hover:border-[#f47c4f]/40">
      <div className="relative cursor-pointer" onClick={onClick}>
        {poster ? (
          <img
            src={poster}
            alt={title}
            loading="lazy"
            className="w-full aspect-[2/3] object-cover"
          />
        ) : (
          <div className="w-full aspect-[2/3] bg-[#262b55] flex items-center justify-center">
            <Icon n="film" className="w-8 h-8 opacity-30" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1 [&>span]:bg-[#0f1226]/85 [&>span]:text-[10px] [&>span]:px-1.5 [&>span]:py-px">
          {chips}
        </div>
        {actions && (
          <div className="absolute inset-x-0 bottom-0 p-1.5 flex gap-1 bg-gradient-to-t from-black/90 to-transparent pt-8 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
            {actions}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div
          className="text-xs font-semibold text-white truncate"
          title={title}
        >
          {title}
        </div>
        {footerLeft && (
          <div className="flex items-center gap-1 text-[11px] text-[#8a90b8] truncate">
            {footerLeft}
          </div>
        )}
      </div>
    </div>
  );
}

export const Grid = ({ children }) => (
  <div className="grid grid-cols-3 sm:grid-cols-4 2xl:grid-cols-5 gap-3">
    {children}
  </div>
);
export const Empty = ({ text }) => (
  <div className={`${PANEL} text-center py-16 text-[#8a90b8]`}>{text}</div>
);

export const Avatar = ({ name, size = "w-10 h-10", text = "text-sm" }) => (
  <div
    className={`${size} ${text} rounded-full bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center font-bold text-white shrink-0`}
  >
    {name?.[0]?.toUpperCase() || "U"}
  </div>
);
