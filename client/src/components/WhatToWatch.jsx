import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Chip, Grid, MovieCard } from "./ui";
import { BTN_ORANGE, BTN_SOFT, ORANGE_FILTER, PANEL } from "./styles";
import { POSTER, TMDB, TMDB_API_KEY } from "../config";
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

// Записи, добавленные до появления поля mediaType, считаются фильмами, даже если
// это сериал. Поэтому при 404 пробуем второй тип.
async function fetchTmdb(type, id, suffix, params = "") {
  const other = type === "tv" ? "movie" : "tv";
  for (const t of [type, other]) {
    const res = await fetch(
      `${TMDB}/${t}/${id}${suffix}?api_key=${TMDB_API_KEY}${params}`,
    );
    if (res.ok) return { data: await res.json(), type: t };
    if (res.status !== 404) break;
  }
  return null;
}

function Providers({ region, onRegionChange, providers, loading }) {
  const regionLabel = REGIONS.find((r) => r.code === region)?.label || region;
  const groups = providers
    ? PROVIDER_GROUPS.filter((g) => providers[g.key]?.length > 0)
    : [];

  return (
    <div className="mt-5 pt-5 border-t border-white/5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4 className="text-sm font-semibold text-white">Где смотреть</h4>
        <label className="flex items-center gap-2 text-xs text-[#8a90b8]">
          Регион
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="bg-[#1c2040] border border-white/5 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-[#f47c4f]/60"
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
        <p className="text-sm text-[#8a90b8]">Ищу, где можно посмотреть...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[#8a90b8]">
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
                    className="inline-flex items-center gap-2 bg-[#1c2040] border border-white/5 rounded-lg pl-1.5 pr-2.5 py-1 text-xs text-[#c9cce6]"
                  >
                    {p.logo_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                        alt=""
                        className="w-5 h-5 rounded"
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
                  className="text-[#f47c4f] hover:underline"
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
      <div className="flex gap-5">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-xl border border-white/10 shrink-0"
          />
        ) : (
          <div className="w-28 sm:w-36 aspect-[2/3] bg-[#262b55] rounded-xl shrink-0 flex items-center justify-center">
            <Icon n="film" className="w-8 h-8 opacity-30" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {movie.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
            {year && <Chip>{year}</Chip>}
            {runtime && <Chip>{runtime}</Chip>}
            {rating && (
              <span className="inline-flex items-center gap-1 text-xs text-[#f47c4f]">
                <Icon n="star" className={`w-3.5 h-3.5 ${ORANGE_FILTER}`} />
                {rating}
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white break-words">
            {movie.title}
          </h3>

          {details?.genres?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {details.genres.map((g) => (
                <span
                  key={g.id}
                  className="text-[11px] text-[#8a90b8] bg-white/5 px-2 py-0.5 rounded"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          <p className="mt-3 text-sm text-[#c9cce6] leading-relaxed line-clamp-6">
            {details
              ? details.overview || "Описание отсутствует"
              : "Загружаю описание..."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAnother}
              disabled={!canPickAnother}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${BTN_SOFT} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Icon n="shuffle" /> Выбрать другой
            </button>
            <button
              type="button"
              onClick={onWatched}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${BTN_ORANGE}`}
            >
              <Icon n="check" className="w-4 h-4 [filter:brightness(0.1)]" />
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
    fetchTmdb(pickedType, pickedTmdbId, "", "&language=ru-RU")
      .then((found) => {
        if (!cancelled) setDetails(found ? found.data : null);
      })
      .catch((error) => console.error("Ошибка загрузки описания:", error));
    return () => {
      cancelled = true;
    };
  }, [pickedTmdbId, pickedType]);

  useEffect(() => {
    if (!pickedTmdbId || !TMDB_API_KEY) return;
    let cancelled = false;
    setProvidersLoading(true);
    setProviders(null);
    fetchTmdb(pickedType, pickedTmdbId, "/watch/providers")
      .then((found) => {
        if (cancelled) return;
        setProviders(found?.data.results?.[region] || null);
        setProvidersLoading(false);
      })
      .catch((error) => {
        console.error("Ошибка загрузки сервисов:", error);
        if (!cancelled) setProvidersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickedTmdbId, pickedType, region]);

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
    <div className="max-w-5xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-white">Что смотреть</h2>
        <p className="text-sm text-[#8a90b8]">
          Случайный выбор из вашего списка и подборка по вашим оценкам
        </p>
      </div>

      <section className={`${PANEL} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg text-white">Из вашего списка</h3>
          <div className="flex gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                aria-pressed={kind === k.id}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  kind === k.id
                    ? "bg-[#f47c4f]/15 text-[#f47c4f]"
                    : "bg-white/5 text-[#8a90b8] hover:text-white"
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
            region={region}
            onRegionChange={changeRegion}
            canPickAnother={watchlist.length > 1}
            onAnother={pickAnother}
            onWatched={() => onMarkWatched(picked.id)}
          />
        ) : (
          <p className="py-8 text-center text-sm text-[#8a90b8]">
            В списке «Буду смотреть» пока ничего нет
            {kind !== "all" ? " для этого фильтра" : ""}. Добавьте фильмы
            через поиск или из подборки ниже.
          </p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h3 className="text-lg text-white">Рекомендации по вашим оценкам</h3>
          {hasWatched && TMDB_API_KEY && (
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={recs.status === "loading"}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${BTN_SOFT} disabled:opacity-50`}
            >
              <Icon n="refresh-cw" className="w-3.5 h-3.5" /> Другая подборка
            </button>
          )}
        </div>

        {!TMDB_API_KEY ? (
          <p className="py-8 text-sm text-[#8a90b8]">
            Не задан ключ TMDB, рекомендации недоступны.
          </p>
        ) : !hasWatched ? (
          <p className="py-8 text-sm text-[#8a90b8]">
            Отметьте несколько фильмов просмотренными и поставьте оценки, и здесь
            появятся рекомендации.
          </p>
        ) : (
          <>
            {recs.seeds.length > 0 && (
              <p className="text-xs text-[#8a90b8] mb-4">
                На основе:{" "}
                {recs.seeds
                  .map((s) => (s.rating ? `${s.title} (${s.rating})` : s.title))
                  .join(", ")}
              </p>
            )}

            {recs.status === "loading" && visibleRecs.length === 0 ? (
              <p className="py-8 text-sm text-[#8a90b8] animate-pulse">
                Подбираю...
              </p>
            ) : visibleRecs.length === 0 ? (
              <p className="py-8 text-sm text-[#8a90b8]">
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
                      poster={`${POSTER}${item.poster_path}`}
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
