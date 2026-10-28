import Icon from "../components/Icon";
import { Chip, CornerButton, Empty, Grid, MovieCard, Pagination } from "../components/ui";
import { BTN_ORANGE, BTN_SOFT, EYEBROW, ORANGE_FILTER, PAGE_TITLE, PANEL, SECTION_TITLE } from "../components/styles";
import { POSTER } from "../config";
import { entryKey, mediaTypeOf } from "../utils/journal";

const FIELD =
  "w-full h-11 rounded-xl bg-[#0d1021] border border-white/[0.09] text-sm font-medium text-white focus:outline-none focus:border-[#ff7a45]";

function CatalogFilters({ catalog }) {
  const {
    filtersOpen,
    setFiltersOpen,
    catalogType,
    changeType,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    minRating,
    setMinRating,
    sortBy,
    setSortBy,
    catalogGenres,
    selectedGenres,
    toggleGenre,
    resetFilters,
    discover,
    loading,
  } = catalog;

  return (
    <aside className={`${PANEL} p-4 sm:p-5 space-y-5 lg:sticky lg:top-[96px] lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`flex items-center gap-2.5 ${SECTION_TITLE}`}>
          <Icon n="sliders-horizontal" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} />
          Фильтры
        </h2>
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={`lg:hidden h-10 px-4 rounded-xl text-sm ${BTN_SOFT}`}>
          {filtersOpen ? "Свернуть" : "Показать"}
        </button>
      </div>
      <div className={`${filtersOpen ? "" : "hidden"} lg:block space-y-5`}>
        <p className="text-[13px] text-[#8b91b5] -mt-2">Подбор идёт по всему каталогу TMDB</p>
        <div className="text-xs font-bold text-[#aeb3d6] space-y-2">
          <span className="block">Тип контента</span>
          <div className="flex gap-1 p-[3px] rounded-xl bg-[#0d1021] border border-white/[0.08]" role="group" aria-label="Тип контента">
            {[{ v: "movie", l: "Фильмы" }, { v: "tv", l: "Сериалы" }].map((o) => (
              <button key={o.v} type="button" aria-pressed={catalogType === o.v} onClick={() => changeType(o.v)} className={`flex-1 h-9 rounded-[9px] text-[13px] font-bold transition-colors ${catalogType === o.v ? "bg-[#1d2140] text-white" : "text-[#8b91b5] hover:text-white"}`}>{o.l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Год от
            <input type="number" min="1900" max="2026" placeholder="2000" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className={`${FIELD} px-3.5 placeholder:text-[#6f759e]`} />
          </label>
          <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Год до
            <input type="number" min="1900" max="2026" placeholder="2026" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className={`${FIELD} px-3.5 placeholder:text-[#6f759e]`} />
          </label>
        </div>
        <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Минимальный рейтинг
          <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className={`${FIELD} px-3`}>
            <option value="0">Любой рейтинг</option><option value="5">От 5.0</option><option value="6">От 6.0</option><option value="7">От 7.0</option><option value="7.5">От 7.5</option><option value="8">От 8.0</option><option value="8.5">От 8.5</option>
          </select>
        </label>
        <label className="text-xs font-bold text-[#aeb3d6] space-y-2 block">Сортировка
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${FIELD} px-3`}>
            <option value="popularity.desc">Сначала популярные</option><option value="vote_average.desc">По рейтингу</option><option value={catalogType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"}>Сначала новые</option><option value="vote_count.desc">По количеству оценок</option>
          </select>
        </label>
        <div className="text-xs font-bold text-[#aeb3d6] space-y-2.5">
          <span className="block">Жанры <span className="font-medium text-[#6f759e]">можно несколько</span></span>
          <div className="flex flex-wrap gap-1.5">
            {catalogGenres.map((genre) => {
              const active = selectedGenres.includes(genre.id);
              return <button type="button" key={genre.id} aria-pressed={active} onClick={() => toggleGenre(genre.id)} className={`min-h-[34px] rounded-full border px-3 text-[12px] font-bold transition ${active ? "border-[#ff7a45] bg-[#ff7a45]/15 text-[#ffa27d]" : "border-white/10 bg-[#0d1021] text-[#aeb3d6] hover:border-white/30"}`}>{genre.name}</button>;
            })}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={resetFilters} className={`flex-1 h-11 px-4 rounded-xl text-sm ${BTN_SOFT}`}>Сбросить</button>
          <button type="button" disabled={loading} onClick={() => discover(1)} className={`flex-1 h-11 px-4 rounded-xl text-sm disabled:opacity-50 ${BTN_ORANGE}`}>{loading ? "Ищем…" : "Подобрать"}</button>
        </div>
      </div>
    </aside>
  );
}

// Вкладка «Искать»: поиск по названию, фильтры слева и результаты по страницам
export default function SearchPage({ catalog, movies, onOpenMovie, onToggleWatchlist, onMarkWatched }) {
  const { inputRef, searchQuery, changeQuery, search, searchResults, searchMode, page, totalPages, loading, error, goToPage } = catalog;
  const byKey = new Map(movies.map((m) => [entryKey(m), m]));

  return (
    <div className="space-y-6">
      <div>
        <div className={`${EYEBROW} mb-2.5`}>Каталог TMDB</div>
        <h1 className={PAGE_TITLE}>Открыть новое</h1>
        <p className="mt-2.5 text-sm text-[#8b91b5]">Ищи по названию или подбери фильмы и сериалы по параметрам</p>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault(); // без перезагрузки страницы по Enter/«Найти» на клавиатуре
          search(searchQuery);
          e.currentTarget.querySelector("input")?.blur(); // прячем клавиатуру телефона
        }}
        className="mg-glass-chip !flex !rounded-full !p-1.5 !pl-4 gap-2"
      >
        <Icon n="search" className={`w-[18px] h-[18px] ${searchQuery ? ORANGE_FILTER : "opacity-60"}`} />
        <input
          ref={inputRef}
          type="search" /* показывает кнопку с лупой на клавиатуре телефона */
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Фильм или сериал"
          aria-label="Поиск фильмов и сериалов"
          value={searchQuery}
          onChange={(e) => changeQuery(e.target.value)}
          className="flex-1 min-w-0 h-11 bg-transparent text-base font-semibold text-white placeholder:text-[#8b91b5] placeholder:font-medium focus:outline-none"
        />
        <button type="submit" className={`h-11 px-5 rounded-full text-sm shrink-0 active:scale-95 ${BTN_ORANGE}`}>
          Найти
        </button>
      </form>

      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start space-y-6 lg:space-y-0">
        <CatalogFilters catalog={catalog} />

        <section className="min-w-0 space-y-5">
          {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

          {searchResults.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className={`flex items-center gap-2.5 ${SECTION_TITLE}`}>
                  {searchMode === "filters" ? (
                    <><Icon n="sliders-horizontal" className={`w-5 h-5 ${ORANGE_FILTER}`} />Подборка по фильтрам</>
                  ) : searchQuery.trim() ? (
                    <><Icon n="search" className={`w-5 h-5 ${ORANGE_FILTER}`} />Результаты поиска</>
                  ) : (
                    <><Icon n="flame" className={`w-5 h-5 ${ORANGE_FILTER}`} />Сейчас популярно</>
                  )}
                </h2>
                {totalPages > 1 && <span className="text-[13px] text-[#8b91b5]">Страница {page} из {totalPages}</span>}
              </div>
              <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
                <Grid withSidebar>
                  {searchResults.map((movie) => {
                    const existing = byKey.get(`${mediaTypeOf(movie)}-${movie.id}`) || null;
                    const year = (movie.release_date || movie.first_air_date || "").slice(0, 4);
                    return (
                      <MovieCard
                        key={`${movie.media_type || "movie"}-${movie.id}`}
                        poster={movie.poster_path ? `${POSTER}${movie.poster_path}` : null}
                        description={movie.overview}
                        title={movie.title || movie.name}
                        chips={
                          <>
                            {year && <Chip>{year}</Chip>}
                            {existing?.rating && (
                              <Chip tone="orange">
                                <Icon n="star" className={`w-3 h-3 inline -mt-0.5 mr-0.5 ${ORANGE_FILTER}`} />
                                {existing.rating}
                              </Chip>
                            )}
                          </>
                        }
                        topLeft={
                          <CornerButton
                            icon="eye"
                            label={existing?.status === "WATCHLIST" ? "Убрать из «Буду смотреть»" : "Буду смотреть"}
                            active={existing?.status === "WATCHLIST"}
                            onClick={() => onToggleWatchlist(movie, existing)}
                          />
                        }
                        topRight={
                          <CornerButton
                            icon="check"
                            tone="green"
                            label={existing?.status === "WATCHED" ? "Изменить оценку" : "Просмотрено"}
                            active={existing?.status === "WATCHED"}
                            onClick={() => onMarkWatched(movie, existing)}
                          />
                        }
                        footerLeft={
                          movie.vote_average ? (
                            <>
                              <Icon n="star" className="w-3.5 h-3.5 opacity-60" /> {movie.vote_average.toFixed(1)}
                            </>
                          ) : null
                        }
                        onClick={() => onOpenMovie(movie)}
                      />
                    );
                  })}
                </Grid>
              </div>
              <Pagination page={page} totalPages={totalPages} disabled={loading} onChange={goToPage} />
            </>
          ) : (
            <Empty
              text={
                loading
                  ? "Загружаем результаты…"
                  : searchMode === "filters"
                    ? "По этим фильтрам ничего не найдено. Попробуй изменить жанры или диапазон лет."
                    : searchQuery
                      ? "Ничего не найдено"
                      : "Введите название для поиска или используйте фильтры"
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
