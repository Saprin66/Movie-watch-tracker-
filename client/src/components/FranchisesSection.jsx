import { useState } from "react";
import Icon from "./Icon";
import { Poster } from "./ui";
import { POSTER } from "../config";

const PREVIEW = 4;

// «Франшизы» в профиле: начатые серии фильмов с прогрессом.
// franchises — результат startedFranchises, onOpenMovie(movie) — открыть фильм (необязательно).
export default function FranchisesSection({ franchises, loading, onOpenMovie }) {
  const [expanded, setExpanded] = useState(false);
  if (!franchises.length && !loading) return null;

  const done = franchises.filter((f) => f.done).length;
  const visible = expanded ? franchises : franchises.slice(0, PREVIEW);

  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-white">
          Франшизы {franchises.length > 0 && <span className="text-[#a19fad]">· {franchises.length}</span>}
        </h2>
        {done > 0 && (
          <span className="mg-glass-chip mg-glass-chip--green !py-1 !px-2.5 !text-[11px]">
            <Icon n="check" className="w-3 h-3" /> досмотрено {done}
          </span>
        )}
      </div>

      {!franchises.length ? (
        <p className="text-sm text-[#b4b2bf] animate-pulse">Ищу серии фильмов в журнале…</p>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((f) => {
            // Обложка — первая часть с постером
            const cover = f.parts.find((p) => p.poster_path);
            const target = f.next || f.parts.find((p) => p.released);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={!onOpenMovie || !target}
                  onClick={() =>
                    onOpenMovie({ id: target.id, media_type: "movie", title: target.title, poster_path: target.poster_path })
                  }
                  className="w-full flex items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/[0.06] transition-colors disabled:hover:bg-transparent"
                >
                  <div className="w-12 shrink-0 aspect-[2/3] overflow-hidden rounded-[10px] border border-white/15">
                    <Poster src={cover ? `${POSTER}${cover.poster_path}` : null} title={f.name} small />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-white">{f.name}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.done ? "bg-[#58dcaa]" : "bg-[#ff7a45]"}`}
                          style={{ width: `${(f.watched / f.total) * 100}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[#cfcdd8]">
                        {f.watched}/{f.total}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs text-[#a19fad]">
                      {f.done ? "Досмотрено целиком" : f.next ? `Следующий: ${f.next.title}` : ""}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {franchises.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mg-glass-btn mg-glass-btn--wide mt-3 w-full h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white"
        >
          {expanded ? "Свернуть" : `Показать все (${franchises.length})`}
          <Icon n={expanded ? "chevron-up" : "chevron-down"} className="w-4 h-4 opacity-70" />
        </button>
      )}
    </section>
  );
}
