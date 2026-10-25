import { useState } from "react";
import Icon from "./Icon";
import { BTN_SOFT, ORANGE_FILTER, PANEL } from "./styles";
import {
  DEFAULT_FILTERS,
  RATING_OPTIONS,
  countActiveFilters,
  isFiltering,
} from "../utils/filterMovies";

const SELECT =
  "w-full h-11 bg-mg-sunken border border-white/[0.09] rounded-xl px-3 text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]";

function Labeled({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-bold text-[#b4b2bf] mb-2">{label}</span>
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
      <div className="flex gap-2.5">
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Icon
            n="search"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50 w-[18px] h-[18px]"
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
            className="w-full min-w-0 h-11 bg-mg-panel border border-white/[0.08] rounded-xl pl-11 pr-3 text-base sm:text-sm text-white placeholder:text-[#6f6d7b] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-colors ${
            open || active > 0
              ? "bg-[#ff7a45]/[0.14] text-[#ff9a6c]"
              : BTN_SOFT
          }`}
        >
          <Icon
            n="sliders-horizontal"
            className={`w-4 h-4 ${open || active > 0 ? ORANGE_FILTER : "opacity-70"}`}
          />
          <span className="hidden sm:inline">Фильтры</span>
          {active > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center">
              {active}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className={`${PANEL} p-4 sm:p-5 space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <p className="text-xs text-[#8f8d9b]">
              Жанры и годы ещё подгружаются для {metaPending} записей. Список
              фильтров станет полнее через несколько секунд.
            </p>
          )}
        </div>
      )}

      {filtering && (
        <div className="flex items-center justify-between gap-3 text-[13px] text-[#8f8d9b]">
          <span>
            Найдено {shownCount} из {totalCount}
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="min-h-[36px] px-3 rounded-full bg-[#ff7a45]/[0.14] font-bold text-[#ff9a6c] hover:bg-[#ff7a45]/25"
          >
            Сбросить всё
          </button>
        </div>
      )}
    </div>
  );
}
