import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import Roulette from "./Roulette";
import TonightPicker from "./TonightPicker";
import { Chip, Grid, MovieCard } from "./ui";
import { BTN_SOFT, EYEBROW, PAGE_TITLE, SECTION_TITLE } from "./styles";
import { POSTER, TMDB, TMDB_API_KEY } from "../config";
import { fetchTmdb, fetchWithRetry } from "../utils/tmdb";
import { genreIdByName, genreName } from "../utils/genres";
import { topGenres } from "../utils/watchStats";
import {
  genreAffinity,
  keyOf,
  mergeRecommendations,
  pickSeeds,
  pickSeedsByReviews,
  rerankByAffinity,
} from "../utils/recommendations";

// Уровень рекомендаций зависит от подписки
const REC_MODES = {
  free: { title: "Рекомендации по любимым жанрам", note: "Базовые" },
  gold: { title: "Рекомендации по вашим оценкам", note: "Улучшенные · Gold" },
  brilliant: { title: "Персональные рекомендации", note: "По вашим отзывам · Brilliant" },
};

// Базовые (Free): популярное в любимом жанре из каталога TMDB
async function genreRecommendations(movies) {
  const favourite = topGenres(movies.filter((m) => m.status === "WATCHED"))
    .map((g) => ({ ...g, id: genreIdByName(g.name) }))
    .find((g) => g.id);
  if (!favourite) return { seeds: [], list: [] };
  const page = 1 + Math.floor(Math.random() * 3);
  const res = await fetchWithRetry(
    `${TMDB}/discover/movie?api_key=${TMDB_API_KEY}&language=ru-RU&with_genres=${favourite.id}&sort_by=popularity.desc&vote_count.gte=200&page=${page}`,
  );
  const data = res.ok ? await res.json() : { results: [] };
  const list = (data.results || [])
    .filter((item) => item.poster_path)
    .map((item) => ({ key: keyOf("movie", item.id), item: { ...item, media_type: "movie" }, votes: 1 }));
  return { seeds: [{ title: `жанр «${favourite.name}»` }], list };
}

const typeOf = (movie) => (movie.mediaType === "tv" ? "tv" : "movie");

export default function WhatToWatch({ movies, onOpenMovie, onMarkWatched, onWant, plan = "free", onOpenPremium }) {
  const [recs, setRecs] = useState({ status: "idle", seeds: [], list: [] });
  const [refreshKey, setRefreshKey] = useState(0);

  const moviesRef = useRef(movies);
  useEffect(() => {
    moviesRef.current = movies;
  }, [movies]);

  // ---- рекомендации по высоким оценкам ----
  const hasWatched = movies.some((m) => m.status === "WATCHED");

  useEffect(() => {
    if (!TMDB_API_KEY || !hasWatched) return;
    let cancelled = false;
    const journal = moviesRef.current;
    const seeds =
      plan === "free" ? [] : plan === "brilliant" ? pickSeedsByReviews(journal, 3) : pickSeeds(journal, 3);

    setRecs((prev) => ({ ...prev, status: "loading", seeds }));

    const load =
      plan === "free"
        ? genreRecommendations(journal)
        : Promise.all(
            seeds.map((seed) =>
              fetchTmdb(typeOf(seed), seed.tmdbId, "/recommendations", "&language=ru-RU")
                .then((found) => ({
                  seed: found ? { ...seed, mediaType: found.type } : seed,
                  results: found?.data.results || [],
                }))
                .catch(() => ({ seed, results: [] })),
            ),
          ).then((lists) => {
            const merged = mergeRecommendations(lists);
            const list =
              plan === "brilliant"
                ? rerankByAffinity(merged, genreAffinity(journal), (id) => genreName(id))
                : merged;
            return { seeds, list };
          });

    load
      .catch(() => ({ seeds, list: [] }))
      .then((result) => {
        if (!cancelled) setRecs({ status: "ready", ...result });
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, hasWatched, plan]);

  const journalKeys = useMemo(
    () => new Set(movies.map((m) => keyOf(m.mediaType, m.tmdbId))),
    [movies],
  );
  const visibleRecs = recs.list
    .filter((r) => !journalKeys.has(r.key))
    .slice(0, 12);

  return (
    <div className="max-w-5xl mx-auto space-y-9">
      <div className="text-center">
        <div className={`${EYEBROW} mb-2.5`}>Выбор на вечер</div>
        <h1 className={PAGE_TITLE}>Что смотреть</h1>
        <p className="mt-2.5 text-sm text-[#8b91b5]">
          Подбор под настроение, рулетка по вашему списку и рекомендации по оценкам
        </p>
      </div>

      <TonightPicker movies={movies} onOpenMovie={onOpenMovie} onWant={onWant} />

      <Roulette movies={movies} onOpenMovie={onOpenMovie} onMarkWatched={onMarkWatched} />

      <section>
        <div className="flex flex-col items-center gap-3 mb-2 text-center">
          <div>
            <h2 className={SECTION_TITLE}>{REC_MODES[plan].title}</h2>
            <div className="mt-1 text-xs text-[#8b91b5]">
              {REC_MODES[plan].note}
              {plan !== "brilliant" && onOpenPremium && (
                <>
                  {" · "}
                  <button type="button" onClick={onOpenPremium} className="font-bold text-[#ff935f] hover:text-[#ffb08c]">
                    {plan === "free" ? "Точнее — в Gold и Brilliant" : "По отзывам — в Brilliant"}
                  </button>
                </>
              )}
            </div>
          </div>
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
          <p className="py-8 text-center text-sm text-[#8b91b5]">
            Не задан ключ TMDB, рекомендации недоступны.
          </p>
        ) : !hasWatched ? (
          <p className="py-8 text-center text-sm text-[#8b91b5]">
            Отметьте несколько фильмов просмотренными и поставьте оценки, и здесь
            появятся рекомендации.
          </p>
        ) : (
          <>
            {recs.seeds.length > 0 && (
              <p className="text-[13px] text-[#8b91b5] mt-1 mb-5 text-center">
                На основе:{" "}
                {recs.seeds
                  .map((s) => (s.rating ? `${s.title} (${s.rating})` : s.title))
                  .join(", ")}
              </p>
            )}

            {recs.status === "loading" && visibleRecs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#8b91b5] animate-pulse">
                Подбираю...
              </p>
            ) : visibleRecs.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#8b91b5]">
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
                      description={item.overview}
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
