import { useState } from "react";
import Icon from "./Icon";
import { BTN_SOFT, ORANGE_FILTER, PANEL } from "./styles";
import {
  DEFAULT_FILTERS,
  KIND_OPTIONS,
  RATING_OPTIONS,
  countActiveFilters,
  isFiltering,
} from "../utils/filterMovies";

const SELECT =
  "w-full bg-[#1c2040] border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f47c4f]/60";

function Labeled({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="block text-[11px] text-[#8a90b8] mb-1">{label}</span>
      {children}
    </label>
  );
}

// Поиск по названию и фильтры для списка «Мой список»
export default function MovieFilters({
  filters,
  onChange,
  facets,
  shownCount,
  totalCount,
  metaPending,
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const set = (patch) => onChange({ ...filters, ...patch });
  const filtering = isFiltering(filters);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Icon
            n="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 w-4 h-4"
          />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Поиск по моему списку"
            aria-label="Поиск по моему списку"
            className="w-full min-w-0 bg-[#1c2040] border border-white/5 rounded-lg pl-10 pr-3 py-2.5 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60 focus:ring-1 focus:ring-[#f47c4f]/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
            open || active > 0
              ? "bg-[#f47c4f]/15 text-[#f47c4f]"
              : BTN_SOFT
          }`}
        >
          <Icon
            n="sliders-horizontal"
            className={`w-4 h-4 ${open || active > 0 ? ORANGE_FILTER : "opacity-70"}`}
          />
          <span className="hidden sm:inline">Фильтры</span>
          {active > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#f47c4f] text-[#1a1020] text-[11px] font-bold flex items-center justify-center">
              {active}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className={`${PANEL} p-3 sm:p-4 space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div role="group" aria-label="Тип" className="min-w-0">
              <span className="block text-[11px] text-[#8a90b8] mb-1">Тип</span>
              <div className="flex gap-1 p-1 bg-[#1c2040] rounded-lg">
                {KIND_OPTIONS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => set({ kind: k.id })}
                    aria-pressed={filters.kind === k.id}
                    className={`flex-1 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      filters.kind === k.id
                        ? "bg-[#f47c4f]/20 text-[#f47c4f]"
                        : "text-[#8a90b8] hover:text-white"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <Labeled label="Жанр">
              <select
                value={filters.genre}
                onChange={(e) => set({ genre: e.target.value })}
                className={SELECT}
              >
                <option value="">Любой</option>
                {facets.genres.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} ({g.count})
                  </option>
                ))}
              </select>
            </Labeled>

            <Labeled label="Годы выхода">
              <select
                value={filters.decade}
                onChange={(e) => set({ decade: e.target.value })}
                className={SELECT}
              >
                <option value="">Любые</option>
                {facets.decades.map((d) => (
                  <option key={d.decade} value={d.decade}>
                    {d.decade}-е ({d.count})
                  </option>
                ))}
              </select>
            </Labeled>

            <Labeled label="Моя оценка">
              <select
                value={filters.rating}
                onChange={(e) => set({ rating: e.target.value })}
                className={SELECT}
              >
                {RATING_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Labeled>
          </div>

          {metaPending > 0 && (
            <p className="text-xs text-[#8a90b8]">
              Жанры и годы ещё подгружаются для {metaPending} записей. Список
              фильтров станет полнее через несколько секунд.
            </p>
          )}
        </div>
      )}

      {filtering && (
        <div className="flex items-center justify-between gap-3 text-xs text-[#8a90b8]">
          <span>
            Найдено {shownCount} из {totalCount}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="text-[#f47c4f] hover:text-[#ff8f66]"
          >
            Сбросить всё
          </button>
        </div>
      )}
    </div>
  );
}
