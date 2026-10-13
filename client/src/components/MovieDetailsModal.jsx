import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Chip } from "./ui";
import { BTN_ORANGE, BTN_SOFT, ORANGE_FILTER } from "./styles";
import { BACKDROP, POSTER_LARGE, PROFILE } from "../config";
import { fetchTmdb } from "../utils/tmdb";
import { useScrollLock } from "../hooks/useScrollLock";

const DETAILS_PARAMS =
  "&language=ru-RU&append_to_response=credits,videos&include_video_language=ru,en,null";

const pluralSeasons = (n) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "сезон";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "сезона";
  return "сезонов";
};

function formatRuntime(details) {
  const minutes =
    details?.runtime ||
    details?.episode_run_time?.[0] ||
    details?.last_episode_to_air?.runtime;
  if (!minutes) return null;
  if (details?.runtime && minutes >= 60) {
    return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
  }
  return details?.runtime ? `${minutes} мин` : `${minutes} мин / серия`;
}

function Skeleton() {
  return (
    <div className="space-y-2.5 animate-pulse" aria-hidden="true">
      <div className="h-3 rounded bg-white/5 w-full" />
      <div className="h-3 rounded bg-white/5 w-11/12" />
      <div className="h-3 rounded bg-white/5 w-9/12" />
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-[#6f759e]">
        {label}
      </dt>
      <dd className="text-sm text-[#c9cce6] break-words">{children}</dd>
    </div>
  );
}

function CastMember({ person }) {
  return (
    <li className="w-[72px] shrink-0 text-center">
      {person.profile_path ? (
        <img
          src={`${PROFILE}${person.profile_path}`}
          alt=""
          loading="lazy"
          className="w-14 h-14 mx-auto rounded-full object-cover border border-white/10"
        />
      ) : (
        <div className="w-14 h-14 mx-auto rounded-full bg-[#262b55] flex items-center justify-center text-sm font-semibold text-[#8a90b8]">
          {person.name?.[0] || "?"}
        </div>
      )}
      <div className="mt-1.5 text-[11px] leading-tight text-white line-clamp-2">
        {person.name}
      </div>
      {person.character && (
        <div className="text-[10px] leading-tight text-[#6f759e] line-clamp-2">
          {person.character}
        </div>
      )}
    </li>
  );
}

// Карточка фильма или сериала из TMDB.
// movie: результат поиска TMDB. existing: запись пользователя, если фильм уже в журнале.
// onAdd(status, details) вызывается при добавлении, onOpenReview: открыть отзыв из журнала.
export default function MovieDetailsModal({
  movie,
  existing,
  onClose,
  onAdd,
  onOpenReview,
}) {
  useScrollLock();

  const type = movie.media_type === "tv" ? "tv" : "movie";
  const [state, setState] = useState({ loading: true, details: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, details: null });

    fetchTmdb(type, movie.id, "", DETAILS_PARAMS)
      .then((found) => {
        if (!cancelled) setState({ loading: false, details: found?.data || null });
      })
      .catch((error) => {
        console.error("Ошибка загрузки деталей:", error);
        if (!cancelled) setState({ loading: false, details: null });
      });

    return () => {
      cancelled = true;
    };
  }, [movie.id, type]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { loading, details } = state;
  const isTv = type === "tv";

  // Пока детали грузятся (или не загрузились), показываем то, что уже есть из поиска
  const data = details || movie;
  const title = data.title || data.name || movie.title || movie.name;
  const originalTitle = data.original_title || data.original_name;
  const year = (data.release_date || data.first_air_date || "").slice(0, 4);
  const posterPath = data.poster_path || movie.poster_path;
  const backdropPath = data.backdrop_path || movie.backdrop_path;
  const overview = data.overview || movie.overview;
  const rating = data.vote_average ? Number(data.vote_average).toFixed(1) : null;
  const runtime = formatRuntime(details);
  const genres = details?.genres || [];

  const crew = details?.credits?.crew || [];
  const directors = isTv
    ? (details?.created_by || []).map((p) => p.name)
    : crew.filter((c) => c.job === "Director").map((c) => c.name);
  const cast = (details?.credits?.cast || []).slice(0, 12);

  const trailer = (details?.videos?.results || []).find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  const handleAdd = (status) => {
    onAdd(status, details);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-3xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col bg-[#171a33] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3 right-3 z-20 p-2 bg-black/55 hover:bg-black/75 rounded-full transition-colors"
        >
          <Icon n="x" className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto scroll-contain">
          {/* Верхняя картинка */}
          <div
            className={`relative bg-[#1c2040] ${backdropPath ? "h-44 sm:h-72" : "h-28 sm:h-36"}`}
          >
            {backdropPath ? (
              <img
                src={`${BACKDROP}${backdropPath}`}
                alt=""
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(244,124,79,0.25),transparent_65%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#171a33] via-[#171a33]/40 to-transparent" />
          </div>

          <div className="relative px-4 sm:px-8 pb-6 -mt-16 sm:-mt-24">
            {/* Постер и заголовок */}
            <div className="flex items-end gap-4 sm:gap-6">
              {posterPath ? (
                <img
                  src={`${POSTER_LARGE}${posterPath}`}
                  alt={title}
                  className="w-28 sm:w-44 aspect-[2/3] self-end object-cover rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10 shrink-0"
                />
              ) : (
                <div className="w-28 sm:w-44 aspect-[2/3] bg-[#262b55] rounded-xl ring-1 ring-white/10 shrink-0 flex items-center justify-center">
                  <Icon n="film" className="w-8 h-8 opacity-30" />
                </div>
              )}

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {isTv && <Chip tone="orange">Сериал</Chip>}
                  {year && <Chip>{year}</Chip>}
                  {runtime && <Chip>{runtime}</Chip>}
                  {isTv && details?.number_of_seasons > 0 && (
                    <Chip>
                      {details.number_of_seasons}{" "}
                      {pluralSeasons(details.number_of_seasons)}
                    </Chip>
                  )}
                </div>

                <h2 className="text-xl sm:text-3xl font-bold text-white leading-tight break-words">
                  {title}
                </h2>
                {originalTitle && originalTitle !== title && (
                  <div className="mt-0.5 text-xs sm:text-sm text-[#8a90b8] break-words">
                    {originalTitle}
                  </div>
                )}

                {rating && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f47c4f]/15 text-[#f47c4f]">
                    <Icon n="star" className={`w-4 h-4 ${ORANGE_FILTER}`} />
                    <span className="text-base font-bold leading-none">
                      {rating}
                    </span>
                    <span className="text-[11px] opacity-70">TMDB</span>
                  </div>
                )}
              </div>
            </div>

            {existing && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <Chip tone={existing.status === "WATCHED" ? "green" : "blue"}>
                  {existing.status === "WATCHED"
                    ? "В журнале: просмотрено"
                    : "В журнале: буду смотреть"}
                </Chip>
                {existing.rating && (
                  <span className="text-[#f47c4f]">
                    Ваша оценка: {existing.rating}/10
                  </span>
                )}
              </div>
            )}

            {details?.tagline && (
              <p className="mt-5 text-sm italic text-[#8a90b8]">
                «{details.tagline}»
              </p>
            )}

            {genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs text-[#9aa0c8] bg-white/5 px-2.5 py-1 rounded-full"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <section className="mt-5">
              <h3 className="text-xs uppercase tracking-wide text-[#6f759e] mb-2">
                Описание
              </h3>
              {loading && !overview ? (
                <Skeleton />
              ) : (
                <p className="text-sm sm:text-[15px] text-[#c9cce6] leading-relaxed whitespace-pre-line">
                  {overview || "Описание отсутствует"}
                </p>
              )}
            </section>

            {(directors.length > 0 || trailer) && (
              <dl className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {directors.length > 0 && (
                  <Fact label={isTv ? "Создатели" : "Режиссёр"}>
                    {directors.join(", ")}
                  </Fact>
                )}
                {trailer && (
                  <Fact label="Трейлер">
                    <a
                      href={`https://www.youtube.com/watch?v=${trailer.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#f47c4f] hover:underline"
                    >
                      <Icon
                        n="play"
                        className={`w-3.5 h-3.5 ${ORANGE_FILTER}`}
                      />
                      Смотреть на YouTube
                    </a>
                  </Fact>
                )}
              </dl>
            )}

            {cast.length > 0 && (
              <section className="mt-6">
                <h3 className="text-xs uppercase tracking-wide text-[#6f759e] mb-3">
                  В ролях
                </h3>
                <ul className="flex gap-3 overflow-x-auto scroll-contain pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {cast.map((person) => (
                    <CastMember key={person.credit_id || person.id} person={person} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* Кнопки всегда под рукой, даже когда описание длинное */}
        <div className="shrink-0 flex gap-2 border-t border-white/5 bg-[#171a33] px-4 sm:px-8 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {existing ? (
            <button
              type="button"
              onClick={() => {
                onOpenReview(existing.id);
                onClose();
              }}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm ${BTN_ORANGE}`}
            >
              <Icon n="message-square-text" className="w-4 h-4 [filter:brightness(0.1)]" />
              Оценка и отзыв
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleAdd("WATCHED")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300"
              >
                <Icon n="check" className="w-4 h-4" /> Смотрел
              </button>
              <button
                type="button"
                onClick={() => handleAdd("WATCHLIST")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors bg-[#f47c4f]/15 hover:bg-[#f47c4f]/25 text-[#f47c4f]"
              >
                <Icon n="bookmark" className="w-4 h-4" /> В список
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`hidden sm:inline-flex items-center justify-center px-4 py-3 rounded-lg text-sm ${BTN_SOFT}`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
