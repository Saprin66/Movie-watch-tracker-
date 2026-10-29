import { useMemo } from "react";
import Icon from "../components/Icon";
import AdBanner from "../components/AdBanner";
import MovieFilters from "../components/MovieFilters";
import { JournalSidebarTop } from "../components/JournalSection";
import { Chip, CornerButton, Empty, Grid, MovieCard, SubTabs } from "../components/ui";
import { BTN_SOFT, EYEBROW, ORANGE_FILTER, PAGE_TITLE, PANEL } from "../components/styles";
import { SORT_OPTIONS, sortMovies } from "../utils/sortMovies";
import { DEFAULT_FILTERS, KIND_OPTIONS, collectFacets, filterMovies, isFiltering } from "../utils/filterMovies";

const STATUS_TABS = [
  { id: "watched", label: "Просмотрено" },
  { id: "watchlist", label: "Буду смотреть" },
];

function ImportProgress({ current, total }) {
  return (
    <div className={`${PANEL} p-4`}>
      <div className="flex justify-between text-sm mb-2.5">
        <span className="font-bold text-white">Импорт фильмов</span>
        <span className="text-[#8b91b5]">{current} из {total}</span>
      </div>
      <div className="h-2 bg-[#0a0c18] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#ff7a45] rounded-full transition-all"
          style={{ width: `${total ? (current / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

// Вкладка «Мой журнал»: слева фильтры и переключатели, справа карточки
export default function JournalPage({
  user,
  movies,
  view,
  subTabs,
  activeTab,
  onTab,
  importState,
  plan,
  onOpenPremium,
  onOpenEntry,
  onToggleWatchlist,
  onMarkWatched,
}) {
  const { status, setStatus, filters, setFilters, sortMode, changeSort } = view;
  const facets = useMemo(() => collectFacets(movies), [movies]);
  const metaPending = movies.filter((m) => m.id && !m.metaCheckedAt).length;

  const byStatus = movies.filter((m) =>
    status === "watchlist" ? m.status === "WATCHLIST" : m.status === "WATCHED",
  );
  const shown = sortMovies(filterMovies(byStatus, filters), sortMode);
  const counts = {
    watched: movies.filter((m) => m.status === "WATCHED").length,
    watchlist: movies.filter((m) => m.status === "WATCHLIST").length,
  };

  return (
    <div className="space-y-6">
      <div className="text-center lg:hidden">
        <div className={`${EYEBROW} mb-2.5`}>Мой список</div>
        <h1 className={PAGE_TITLE}>Журнал {user?.username}</h1>
      </div>

      {importState.importing && <ImportProgress current={importState.current} total={importState.total} />}

      <div className="space-y-3 lg:hidden">
        <SubTabs
          items={STATUS_TABS.map((t) => ({ ...t, count: counts[t.id] }))}
          active={status}
          onChange={setStatus}
          className="flex justify-center"
          itemClass="sm:w-[190px]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <SubTabs
            items={KIND_OPTIONS}
            active={filters.kind}
            onChange={(kind) => setFilters({ ...filters, kind })}
            className="flex flex-1 sm:flex-none min-w-0"
            itemClass="sm:w-[120px]"
          />
          <label className="mg-glass-chip relative !p-0 sm:!pl-4 sm:!pr-1 w-12 sm:w-auto h-12 !justify-center ml-auto shrink-0 text-[13px] !font-bold text-[#aeb3d6]" title="Сортировка">
            <Icon n="arrow-down-up" className="w-[18px] h-[18px] sm:w-4 sm:h-4 sm:opacity-70" />
            <span className="sr-only">Сортировка</span>
            <select
              value={sortMode}
              onChange={(e) => changeSort(e.target.value)}
              aria-label="Сортировка"
              className="absolute inset-0 opacity-0 sm:static sm:opacity-100 h-12 sm:h-10 w-full sm:w-auto bg-transparent pr-2 text-sm font-bold text-white focus:outline-none [&>option]:bg-[#12152a]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start space-y-6 lg:space-y-0">
        <MovieFilters
          filters={filters}
          onChange={setFilters}
          facets={facets}
          shownCount={shown.length}
          totalCount={byStatus.length}
          metaPending={metaPending}
          kindOptions={KIND_OPTIONS}
          sortOptions={SORT_OPTIONS}
          top={
            <>
              <JournalSidebarTop user={user} subTabs={subTabs} activeTab={activeTab} onTab={onTab} />
              <div className="space-y-1" role="group" aria-label="Статус">
                {STATUS_TABS.map((t) => {
                  const selected = status === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setStatus(t.id)}
                      aria-pressed={selected}
                      className={`w-full h-11 flex items-center gap-3 px-3 rounded-xl text-sm font-bold transition-colors ${
                        selected
                          ? "bg-[#ff7a45]/[0.14] text-[#ff9a6c]"
                          : "text-[#aeb3d6] hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      <Icon
                        n={t.id === "watched" ? "circle-check" : "bookmark"}
                        className={`w-[18px] h-[18px] ${selected ? ORANGE_FILTER : "opacity-60"}`}
                      />
                      {t.label}
                      <span className={`ml-auto min-w-[28px] h-6 px-2 rounded-full text-xs font-extrabold flex items-center justify-center ${selected ? "bg-[#ff7a45] text-[#1b0d07]" : "bg-white/[0.07] text-[#aeb3d6]"}`}>
                        {counts[t.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          }
          sortMode={sortMode}
          onSortChange={changeSort}
        />

        <section className="min-w-0 space-y-6">
          {plan === "free" && <AdBanner onOpenPremium={onOpenPremium} />}
          {shown.length === 0 ? (
            isFiltering(filters) && byStatus.length > 0 ? (
              <div className={`${PANEL} text-center py-14 px-6`}>
                <p className="text-[#c4c8e4] mb-4">По этим условиям ничего не нашлось.</p>
                <button
                  type="button"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                  className={`h-11 px-5 rounded-xl text-sm ${BTN_SOFT}`}
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <Empty text="Здесь пока пусто. Найди фильм через лупу внизу или раздел «Искать» и добавь его." />
            )
          ) : (
            <Grid withSidebar>
              {shown.map((movie) => (
                <MovieCard
                  key={movie.id}
                  note={movie.comment}
                  tmdb={movie.tmdbId ? { id: movie.tmdbId, type: movie.mediaType } : null}
                  poster={movie.posterUrl}
                  title={movie.title}
                  onClick={() => onOpenEntry(movie)}
                  chips={
                    <>
                      {/* Год под карточкой, а «Сериал» не нужен, когда и так выбраны сериалы */}
                      {movie.mediaType === "tv" && filters.kind !== "tv" && <Chip tone="orange">Сериал</Chip>}
                      {movie.rating && (
                        <Chip tone="orange">
                          <Icon n="star" className={`w-3 h-3 inline -mt-0.5 mr-0.5 ${ORANGE_FILTER}`} />
                          {movie.rating}
                        </Chip>
                      )}
                    </>
                  }
                  topLeft={
                    <CornerButton
                      icon="eye"
                      label={movie.status === "WATCHLIST" ? "Убрать из «Буду смотреть»" : "Буду смотреть"}
                      active={movie.status === "WATCHLIST"}
                      onClick={() => onToggleWatchlist(movie)}
                    />
                  }
                  topRight={
                    <CornerButton
                      icon="check"
                      tone="green"
                      label={movie.status === "WATCHED" ? "Изменить оценку" : "Просмотрено"}
                      active={movie.status === "WATCHED"}
                      onClick={() => onMarkWatched(movie)}
                    />
                  }
                  footerLeft={movie.releaseYear || (movie.mediaType === "tv" ? "Сериал" : "Фильм")}
                />
              ))}
            </Grid>
          )}
        </section>
      </div>
    </div>
  );
}
