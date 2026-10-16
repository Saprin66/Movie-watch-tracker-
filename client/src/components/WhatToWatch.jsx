import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Chip, Grid, MovieCard, Poster } from "./ui";
import { BTN_ORANGE, BTN_SOFT, DARK_ICON, EYEBROW, ORANGE_FILTER, PAGE_TITLE, PANEL, SECTION_TITLE } from "./styles";
import { POSTER, TMDB_API_KEY } from "../config";
import { fetchTmdb } from "../utils/tmdb";
import {
  keyOf,
  mergeRecommendations,
  pickSeeds,
} from "../utils/recommendations";

const REGIONS = [
  { code: "RU", label: "Россия" },
  { code: "BY", label: "Беларусь" },
  { code: "KZ", label: "Казахстан" },
  { code: "UA", label: "Украина" },
  { code: "US", label: "США" },
  { code: "GB", label: "Великобритания" },
  { code: "DE", label: "Германия" },
];

const KINDS = [
  { id: "all", label: "Всё" },
  { id: "movie", label: "Фильмы" },
  { id: "tv", label: "Сериалы" },
];

const PROVIDER_GROUPS = [
  { key: "flatrate", label: "По подписке" },
  { key: "free", label: "Бесплатно" },
  { key: "ads", label: "Бесплатно с рекламой" },
  { key: "rent", label: "Аренда" },
  { key: "buy", label: "Покупка" },
];

const readSetting = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};
const saveSetting = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* без хранилища просто не запоминаем */
  }
};

const typeOf = (movie) => (movie.mediaType === "tv" ? "tv" : "movie");

function Providers({ region, onRegionChange, providers, loading, failed }) {
  const regionLabel = REGIONS.find((r) => r.code === region)?.label || region;
  const groups = providers
    ? PROVIDER_GROUPS.filter((g) => providers[g.key]?.length > 0)
    : [];

  return (
    <div className="mt-6 pt-5 border-t border-white/[0.07]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#7b81a6]">Где смотреть</h4>
        <label className="flex items-center gap-2 text-xs text-[#8b91b5]">
          Регион
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="h-10 bg-[#0d1021] border border-white/[0.09] rounded-xl px-3 text-sm font-bold text-white focus:outline-none focus:border-[#ff7a45]"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-[#8b91b5]">Ищу, где можно посмотреть...</p>
      ) : failed ? (
        <p className="text-sm text-[#8b91b5]">
          Не удалось получить данные о сервисах: нет связи с TMDB.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[#8b91b5]">
          Для региона «{regionLabel}» нет данных о сервисах. Попробуйте другой
          регион.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="text-[11px] text-[#6f759e] mb-1.5">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {providers[group.key].map((p) => (
                  <span
                    key={p.provider_id}
                    className="inline-flex items-center gap-2.5 bg-[#0d1021] border border-white/[0.08] rounded-xl pl-2 pr-3.5 py-2 text-[13px] font-bold text-[#e9ebf7]"
                  >
                    {p.logo_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                        alt=""
                        className="w-7 h-7 rounded-lg"
                      />
                    )}
                    {p.provider_name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-[#6f759e]">
            Данные о доступности предоставлены JustWatch через TMDB.
            {providers.link && (
              <>
                {" "}
                <a
                  href={providers.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ff7a45] hover:underline"
                >
                  Открыть страницу
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// Карточка выбранного фильма без загрузки данных
export function PickedMovie({
  movie,
  details,
  providers,
  providersLoading,
  providersFailed,
  detailsFailed,
  onRetry,
  region,
  onRegionChange,
  canPickAnother,
  onAnother,
  onWatched,
}) {
  const year = (details?.release_date || details?.first_air_date || "").slice(
    0,
    4,
  );
  const runtime = details?.runtime
    ? `${Math.floor(details.runtime / 60)}ч ${details.runtime % 60}м`
    : details?.episode_run_time?.[0]
      ? `${details.episode_run_time[0]}м/эп`
      : null;
  const rating = details?.vote_average ? details.vote_average.toFixed(1) : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
        <div className="w-40 sm:w-[220px] aspect-[2/3] self-center sm:self-start shrink-0 overflow-hidden rounded-[18px] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <Poster src={movie.posterUrl} title={movie.title} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {movie.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
            {year && <Chip>{year}</Chip>}
            {runtime && <Chip>{runtime}</Chip>}
            {rating && (
              <span className="inline-flex items-center gap-1 text-xs text-[#ff7a45]">
                <Icon n="star" className={`w-3.5 h-3.5 ${ORANGE_FILTER}`} />
                {rating}
              </span>
            )}
          </div>

          <h3 className="font-display text-2xl sm:text-[28px] font-bold leading-tight text-white break-words">
            {movie.title}
          </h3>

          {details?.genres?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {details.genres.map((g) => (
                <span
                  key={g.id}
                  className="text-xs font-bold text-[#aeb3d6] bg-white/[0.07] px-3 py-1 rounded-full"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {detailsFailed ? (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              <span className="flex-1 min-w-[200px]">
                Не удалось загрузить описание: нет связи с TMDB. Проверь интернет или VPN.
              </span>
              <button
                type="button"
                onClick={onRetry}
                className={`h-10 px-4 rounded-xl text-sm ${BTN_SOFT}`}
              >
                Повторить
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#c4c8e4] leading-[1.7] line-clamp-6">
              {details
                ? details.overview || "Описание отсутствует"
                : "Загружаю описание..."}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onAnother}
              disabled={!canPickAnother}
              className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm ${BTN_SOFT} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Icon n="shuffle" /> Выбрать другой
            </button>
            <button
              type="button"
              onClick={onWatched}
              className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm ${BTN_ORANGE}`}
            >
              <Icon n="check" className={`w-4 h-4 ${DARK_ICON}`} />
              Отметить просмотренным
            </button>
          </div>
        </div>
      </div>

      <Providers
        region={region}
        onRegionChange={onRegionChange}
        providers={providers}
        loading={providersLoading}
        failed={providersFailed}
      />
    </div>
  );
}

export default function WhatToWatch({ movies, onOpenMovie, onMarkWatched }) {
  const [kind, setKind] = useState("all");
  const [pickedId, setPickedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [providers, setProviders] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [detailsFailed, setDetailsFailed] = useState(false);
  const [providersFailed, setProvidersFailed] = useState(false);
  // Увеличивается по кнопке «Повторить», чтобы заново запросить данные TMDB
  const [retryKey, setRetryKey] = useState(0);
  const [region, setRegion] = useState(() => readSetting("watchRegion", "RU"));
  const [recs, setRecs] = useState({ status: "idle", seeds: [], list: [] });
  const [refreshKey, setRefreshKey] = useState(0);

  const moviesRef = useRef(movies);
  useEffect(() => {
    moviesRef.current = movies;
  }, [movies]);

  // ---- случайный выбор из «Буду смотреть» ----
  const watchlist = useMemo(
    () =>
      movies.filter(
        (m) =>
          m.status === "WATCHLIST" && (kind === "all" || typeOf(m) === kind),
      ),
    [movies, kind],
  );
  const picked = watchlist.find((m) => m.id === pickedId) || null;

  useEffect(() => {
    if (!picked && watchlist.length > 0) {
      setPickedId(watchlist[Math.floor(Math.random() * watchlist.length)].id);
    }
  }, [picked, watchlist]);

  const pickAnother = () => {
    const others = watchlist.filter((m) => m.id !== pickedId);
    if (others.length > 0) {
      setPickedId(others[Math.floor(Math.random() * others.length)].id);
    }
  };

  const pickedTmdbId = picked?.tmdbId;
  const pickedType = picked ? typeOf(picked) : null;

  useEffect(() => {
    if (!pickedTmdbId || !TMDB_API_KEY) return;
    let cancelled = false;
    setDetails(null);
    setDetailsFailed(false);
    fetchTmdb(pickedType, pickedTmdbId, "", "&language=ru-RU")
      .then((found) => {
        if (!cancelled) setDetails(found ? found.data : { overview: "" });
      })
      .catch((error) => {
        console.warn("Не удалось загрузить описание из TMDB:", error.message);
        if (!cancelled) setDetailsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pickedTmdbId, pickedType, retryKey]);

  useEffect(() => {
    if (!pickedTmdbId || !TMDB_API_KEY) return;
    let cancelled = false;
    setProvidersLoading(true);
    setProviders(null);
    setProvidersFailed(false);
    fetchTmdb(pickedType, pickedTmdbId, "/watch/providers")
      .then((found) => {
        if (cancelled) return;
        setProviders(found?.data.results?.[region] || null);
        setProvidersLoading(false);
      })
      .catch((error) => {
        console.warn("Не удалось загрузить сервисы из TMDB:", error.message);
        if (!cancelled) {
          setProvidersLoading(false);
          setProvidersFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pickedTmdbId, pickedType, region, retryKey]);

  const changeRegion = (code) => {
    setRegion(code);
    saveSetting("watchRegion", code);
  };

  // ---- рекомендации по высоким оценкам ----
  const hasWatched = movies.some((m) => m.status === "WATCHED");

  useEffect(() => {
    if (!TMDB_API_KEY || !hasWatched) return;
    let cancelled = false;
    const seeds = pickSeeds(moviesRef.current, 3);

    setRecs((prev) => ({ ...prev, status: "loading", seeds }));
    Promise.all(
      seeds.map((seed) =>
        fetchTmdb(typeOf(seed), seed.tmdbId, "/recommendations", "&language=ru-RU")
          .then((found) => ({
            seed: found ? { ...seed, mediaType: found.type } : seed,
            results: found?.data.results || [],
          }))
          .catch(() => ({ seed, results: [] })),
      ),
    ).then((lists) => {
      if (!cancelled) {
        setRecs({ status: "ready", seeds, list: mergeRecommendations(lists) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, hasWatched]);

  const journalKeys = useMemo(
    () => new Set(movies.map((m) => keyOf(m.mediaType, m.tmdbId))),
    [movies],
  );
  const visibleRecs = recs.list
    .filter((r) => !journalKeys.has(r.key))
    .slice(0, 12);

  return (
    <div className="max-w-5xl space-y-9">
      <div>
        <div className={`${EYEBROW} mb-2.5`}>Выбор на вечер</div>
        <h1 className={PAGE_TITLE}>Что смотреть</h1>
        <p className="mt-2.5 text-sm text-[#8b91b5]">
          Случайный выбор из вашего списка и подборка по вашим оценкам
        </p>
      </div>

      <section className={`${PANEL} relative overflow-hidden rounded-[24px] p-5 sm:p-7 mg-glow-corner`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className={SECTION_TITLE}>Из вашего списка</h2>
          <div className="flex gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`min-h-[36px] px-4 rounded-full text-[13px] font-bold transition-colors ${
                  kind === k.id
                    ? "bg-[#ff7a45]/[0.16] text-[#ff9a6c]"
                    : "bg-white/[0.06] text-[#8b91b5] hover:text-white"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        {picked ? (
          <PickedMovie
            movie={picked}
            details={details}
            providers={providers}
            providersLoading={providersLoading}
            providersFailed={providersFailed}
            detailsFailed={detailsFailed}
            onRetry={() => setRetryKey((k) => k + 1)}
            region={region}
            onRegionChange={changeRegion}
            canPickAnother={watchlist.length > 1}
            onAnother={pickAnother}
            onWatched={() => onMarkWatched(picked.id)}
          />
        ) : (
          <p className="py-8 text-center text-sm text-[#8b91b5]">
            В списке «Буду смотреть» пока ничего нет
            {kind !== "all" ? " для этого фильтра" : ""}. Добавьте фильмы
            через поиск или из подборки ниже.
          </p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h2 className={SECTION_TITLE}>Рекомендации по вашим оценкам</h2>
          {hasWatched && TMDB_API_KEY && (
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={recs.status === "loading"}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] ${BTN_SOFT} disabled:opacity-50`}
            >
              <Icon n="refresh-cw" className="w-3.5 h-3.5" /> Другая подборка
            </button>
          )}
        </div>

        {!TMDB_API_KEY ? (
          <p className="py-8 text-sm text-[#8b91b5]">
            Не задан ключ TMDB, рекомендации недоступны.
          </p>
        ) : !hasWatched ? (
          <p className="py-8 text-sm text-[#8b91b5]">
            Отметьте несколько фильмов просмотренными и поставьте оценки, и здесь
            появятся рекомендации.
          </p>
        ) : (
          <>
            {recs.seeds.length > 0 && (
              <p className="text-[13px] text-[#8b91b5] mt-1 mb-5">
                На основе:{" "}
                {recs.seeds
                  .map((s) => (s.rating ? `${s.title} (${s.rating})` : s.title))
                  .join(", ")}
              </p>
            )}

            {recs.status === "loading" && visibleRecs.length === 0 ? (
              <p className="py-8 text-sm text-[#8b91b5] animate-pulse">
                Подбираю...
              </p>
            ) : visibleRecs.length === 0 ? (
              <p className="py-8 text-sm text-[#8b91b5]">
                Новых рекомендаций не нашлось. Попробуйте другую подборку.
              </p>
            ) : (
              <Grid>
                {visibleRecs.map(({ key, item }) => {
                  const title = item.title || item.name;
                  const year = (
                    item.release_date ||
                    item.first_air_date ||
                    ""
                  ).slice(0, 4);
                  return (
                    <MovieCard
                      key={key}
                      poster={item.poster_path ? `${POSTER}${item.poster_path}` : null}
                      title={title}
                      chips={
                        <>
                          {year && <Chip>{year}</Chip>}
                          {item.media_type === "tv" && (
                            <Chip tone="orange">Сериал</Chip>
                          )}
                        </>
                      }
                      footerLeft={
                        item.vote_average ? (
                          <>
                            <Icon n="star" className="w-3.5 h-3.5 opacity-60" />{" "}
                            {item.vote_average.toFixed(1)}
                          </>
                        ) : null
                      }
                      onClick={() => onOpenMovie(item)}
                    />
                  );
                })}
              </Grid>
            )}
          </>
        )}
      </section>
    </div>
  );
}
