import { useState } from "react";
import Icon from "./Icon";
import { Poster } from "./ui";
import { POSTER } from "../config";
import { collectionProgress, journalIndex, useCollection } from "../utils/franchises";

// «Коллекция» на странице фильма: все части серии по порядку выхода с отметками из журнала.
// onOpenMovie(movie) открывает часть, onAddToWatchlist(parts) добавляет части в «Буду смотреть».
export default function CollectionBlock({ collectionId, currentId, movies, onOpenMovie, onAddToWatchlist }) {
  const { collection, loading } = useCollection(collectionId);
  const [adding, setAdding] = useState(false);

  if (loading || !collection) return null;
  const progress = collectionProgress(collection, journalIndex(movies));
  // Серия из одного фильма — не серия
  if (progress.parts.length < 2) return null;

  const missing = progress.parts.filter((p) => p.released && !p.entry);

  const addMissing = async () => {
    setAdding(true);
    await onAddToWatchlist(missing);
    setAdding(false);
  };

  return (
    <section className="mg-glass-panel rounded-[24px] p-5 sm:p-7">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">Коллекция</h2>
        {progress.total > 0 && (
          <span className={`mg-glass-chip !py-1 !px-2.5 !text-xs ${progress.done ? "mg-glass-chip--green" : ""}`}>
            {progress.done && <Icon n="check" className="w-3.5 h-3.5" />}
            {progress.watched} из {progress.total}
          </span>
        )}
      </div>
      <h3 className="font-display text-[19px] font-semibold text-white">{progress.name}</h3>
      <p className="mt-1 text-xs text-[#a19fad]">По порядку выхода</p>

      {progress.total > 0 && (
        <div className="mt-3 h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff7a45] to-[#ffb08c] transition-[width] duration-500"
            style={{ width: `${(progress.watched / progress.total) * 100}%` }}
          />
        </div>
      )}

      {progress.next && progress.next.id !== currentId && (
        <button
          type="button"
          onClick={() => onOpenMovie(progress.next)}
          className="mt-4 w-full flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/[0.1] p-3 pl-4 text-left transition-transform active:scale-[0.99]"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#ff935f]">
              {progress.watched ? "Следующий" : "Начать с"}
            </span>
            <span className="block truncate text-sm font-bold text-white">{progress.next.title}</span>
          </span>
          <Icon n="chevron-right" className="w-4 h-4 opacity-60" />
        </button>
      )}

      <ol className="no-scrollbar -mx-5 sm:-mx-7 mt-4 px-5 sm:px-7 flex gap-3 overflow-x-auto pb-1">
        {progress.parts.map((part, i) => {
          const watched = part.entry?.status === "WATCHED";
          const current = part.id === currentId;
          return (
            <li key={part.id} className="w-[104px] shrink-0">
              <button
                type="button"
                disabled={current}
                onClick={() => onOpenMovie(part)}
                className="w-full text-left transition-transform active:scale-95 disabled:active:scale-100"
              >
                <div
                  className={`relative aspect-[2/3] overflow-hidden rounded-[14px] border ${
                    current ? "border-2 border-[#ff7a45]" : "border-white/15"
                  } ${part.released ? "" : "opacity-60"}`}
                >
                  <Poster src={part.poster_path ? `${POSTER}${part.poster_path}` : null} title={part.title} small />
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-mg-ink/80 px-2 py-0.5 text-[11px] font-extrabold text-white">
                    {i + 1}
                  </span>
                  {watched && (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-emerald-400/90 px-1.5 py-0.5 text-[11px] font-extrabold text-[#0b1a14]">
                      ✓{part.entry.rating ? ` ${part.entry.rating}` : ""}
                    </span>
                  )}
                  {part.entry?.status === "WATCHLIST" && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-sky-400/90 px-2 py-0.5 text-[10px] font-extrabold text-[#06121f]">
                      В списке
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-bold leading-tight text-white line-clamp-2">{part.title}</div>
                <div className="text-[11px] text-[#a19fad]">
                  {part.released ? part.release_date.slice(0, 4) : "Скоро"}
                  {current ? " · этот фильм" : ""}
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      {missing.length > 0 && (
        <button
          type="button"
          disabled={adding}
          onClick={addMissing}
          className="mg-glass-btn mg-glass-btn--wide mt-4 w-full h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-60"
        >
          <Icon n={adding ? "loader-circle" : "bookmark-plus"} className={`w-4 h-4 ${adding ? "animate-spin" : ""}`} />
          {missing.length === 1 ? "Добавить недостающую часть в «Буду смотреть»" : `Добавить остальные (${missing.length}) в «Буду смотреть»`}
        </button>
      )}
    </section>
  );
}
