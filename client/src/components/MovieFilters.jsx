import { useState } from "react";
import Icon from "./Icon";
import { BTN_SOFT, ORANGE_FILTER, PANEL, SECTION_TITLE } from "./styles";
import {
  DEFAULT_FILTERS,
  RATING_OPTIONS,
  countActiveFilters,
  isFiltering,
} from "../utils/filterMovies";

const SELECT =
  "w-full h-11 bg-[#0d1021] border border-white/[0.09] rounded-xl px-3 text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]";

function Labeled({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-bold text-[#aeb3d6] mb-2">{label}</span>
      {children}
    </label>
  );
}

// Поиск по названию и фильтры для списка «Мой список».
// На компьютере это боковая панель слева от карточек: всё раскрыто, плюс тип и сортировка.
// На телефоне — строка поиска с кнопкой «Фильтры», тип и сортировка остаются над ней.
export default function MovieFilters({
  filters,
  onChange,
  facets,
  shownCount,
  totalCount,
  metaPending,
  kindOptions,
  sortOptions,
  sortMode,
  onSortChange,
  top,
}) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const set = (patch) => onChange({ ...filters, ...patch });
  const filtering = isFiltering(filters);

  return (
    <aside className="space-y-3 lg:space-y-5 lg:p-5 lg:sticky lg:top-[96px] lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto lg:bg-[#12152a] lg:border lg:border-white/[0.07] lg:rounded-[20px]">
      {top && (
        <div className="hidden lg:block space-y-4 pb-5 border-b border-white/[0.07]">{top}</div>
      )}
      <h2 className={`hidden lg:flex items-center gap-2.5 ${SECTION_TITLE}`}>
        <Icon n="sliders-horizontal" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} />
        Фильтры
        {active > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center">
            {active}
          </span>
        )}
      </h2>
      <div className="flex gap-2.5">
        <div className="relative flex-1 min-w-0 sm:max-w-sm lg:max-w-none">
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
            className="w-full min-w-0 h-11 bg-[#12152a] lg:bg-[#0d1021] border border-white/[0.08] rounded-xl pl-11 pr-3 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`lg:hidden shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold transition-colors ${
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

      <div className={`${open ? "" : "hidden"} lg:block ${PANEL} lg:bg-transparent lg:border-0 lg:rounded-none p-4 sm:p-5 lg:p-0 space-y-4`}>
          <div role="group" aria-label="Тип" className="hidden lg:block">
            <span className="block text-xs font-bold text-[#aeb3d6] mb-2">Тип</span>
            <div className="flex gap-1 p-1 bg-[#0d1021] border border-white/[0.08] rounded-xl">
              {kindOptions.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => set({ kind: k.id })}
                  aria-pressed={filters.kind === k.id}
                  className={`flex-1 h-9 px-2 rounded-[9px] text-[13px] font-bold transition-colors ${
                    filters.kind === k.id
                      ? "bg-[#1d2140] text-white"
                      : "text-[#8b91b5] hover:text-white"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
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

            <div className="hidden lg:block">
              <Labeled label="Сортировка">
                <select
                  value={sortMode}
                  onChange={(e) => onSortChange(e.target.value)}
                  className={SELECT}
                >
                  {sortOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Labeled>
            </div>
          </div>

          {metaPending > 0 && (
            <p className="text-xs text-[#8b91b5]">
              Жанры и годы ещё подгружаются для {metaPending} записей. Список
              фильтров станет полнее через несколько секунд.
            </p>
          )}
      </div>

      {filtering && (
        <div className="flex items-center justify-between gap-3 text-[13px] text-[#8b91b5]">
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
    </aside>
  );
}
