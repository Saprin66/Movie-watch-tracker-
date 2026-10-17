import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Chip, Poster } from "./ui";
import { BTN_ORANGE, BTN_SOFT, DARK_ICON, ORANGE_FILTER } from "./styles";
import { BACKDROP, POSTER_LARGE, PROFILE } from "../config";
import { fetchTmdb } from "../utils/tmdb";
import { useScrollLock } from "../hooks/useScrollLock";
import { useAuth } from "../context/AuthContext";
import { itemFromTmdb, listsRequest } from "../utils/listsApi";

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
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7b81a6] mb-1.5">
        {label}
      </dt>
      <dd className="text-[15px] font-bold text-white break-words">{children}</dd>
    </div>
  );
}

function CastMember({ person }) {
  return (
    <li className="w-[84px] shrink-0 text-center">
      {person.profile_path ? (
        <img
          src={`${PROFILE}${person.profile_path}`}
          alt=""
          loading="lazy"
          className="w-[68px] h-[68px] mx-auto rounded-full object-cover border-2 border-white/10"
        />
      ) : (
        <div className="w-[68px] h-[68px] mx-auto rounded-full bg-gradient-to-br from-[#ff7a45]/70 to-[#8b5cf6]/70 border-2 border-white/10 flex items-center justify-center text-lg font-extrabold text-white">
          {person.name?.[0] || "?"}
        </div>
      )}
      <div className="mt-2.5 text-xs font-bold leading-tight text-[#e9ebf7] line-clamp-2">
        {person.name}
      </div>
      {person.character && (
        <div className="mt-0.5 text-[11px] leading-tight text-[#7b81a6] line-clamp-2">
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

  // «В общий список»: выбор списка «смотрим вместе»
  const { token } = useAuth();
  const [listsOpen, setListsOpen] = useState(false);
  const [lists, setLists] = useState(null);
  const [listsError, setListsError] = useState("");
  const [listStatus, setListStatus] = useState({});

  const toggleLists = async () => {
    const next = !listsOpen;
    setListsOpen(next);
    if (next && lists === null) {
      const result = await listsRequest(token);
      setLists(result.ok ? result.data : []);
      setListsError(result.ok ? "" : result.error);
    }
  };

  const addToList = async (list) => {
    setListStatus((prev) => ({ ...prev, [list.id]: "adding" }));
    const result = await listsRequest(token, `/${list.id}/items`, {
      method: "POST",
      body: itemFromTmdb({ ...movie, ...(details || {}), media_type: type }),
    });
    setListStatus((prev) => ({
      ...prev,
      [list.id]: result.ok ? "added" : result.status === 409 ? "exists" : result.error,
    }));
  };

  const handleAdd = (status) => {
    onAdd(status, details);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-[#04050c]/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-[860px] max-h-[94dvh] sm:max-h-[90vh] flex flex-col bg-[#12152a] border border-white/10 rounded-t-[26px] sm:rounded-[28px] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 w-11 h-11 flex items-center justify-center bg-[#080a16]/70 hover:bg-[#080a16]/90 backdrop-blur rounded-full transition-colors"
        >
          <Icon n="x" className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto scroll-contain">
          {/* Верхняя картинка */}
          <div
            className={`relative mg-glow-backdrop ${backdropPath ? "h-48 sm:h-[300px]" : "h-32 sm:h-44"}`}
          >
            {backdropPath && (
              <img
                src={`${BACKDROP}${backdropPath}`}
                alt=""
                className="w-full h-full object-cover object-top"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#12152a] via-[#12152a]/45 to-transparent" />
          </div>

          <div className="relative px-[18px] sm:px-10 pb-7 -mt-20 sm:-mt-28">
            {/* Постер и заголовок */}
            <div className="flex items-end gap-4 sm:gap-7">
              <div className="w-[118px] sm:w-[190px] aspect-[2/3] self-end shrink-0 overflow-hidden rounded-[14px] sm:rounded-[18px] border border-white/[0.14] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
                <Poster src={posterPath ? `${POSTER_LARGE}${posterPath}` : null} title={title} />
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
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

                <h2 className="font-display text-[21px] sm:text-[34px] font-bold text-white leading-[1.08] break-words">
                  {title}
                </h2>
                {originalTitle && originalTitle !== title && (
                  <div className="mt-1.5 text-xs sm:text-[13px] text-[#8b91b5] break-words">
                    {originalTitle}
                  </div>
                )}

                {rating && (
                  <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ff7a45]/[0.16] text-[#ff935f]">
                    <Icon n="star" className={`w-[18px] h-[18px] ${ORANGE_FILTER}`} />
                    <span className="font-display text-lg sm:text-xl font-bold leading-none">
                      {rating}
                    </span>
                    <span className="text-[11px] font-bold opacity-75">TMDB</span>
                  </div>
                )}
              </div>
            </div>

            {existing && (
              <div className="mt-6 flex flex-wrap items-center gap-2.5 text-sm">
                <Chip tone={existing.status === "WATCHED" ? "green" : "blue"}>
                  {existing.status === "WATCHED"
                    ? "В журнале: просмотрено"
                    : "В журнале: буду смотреть"}
                </Chip>
                {existing.rating && (
                  <span className="font-bold text-[#ff935f]">
                    Ваша оценка: {existing.rating}/10
                  </span>
                )}
              </div>
            )}

            {details?.tagline && (
              <p className="mt-6 text-sm sm:text-[15px] italic text-[#8b91b5]">
                «{details.tagline}»
              </p>
            )}

            {genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="text-xs font-bold text-[#c4c8e4] bg-white/[0.08] px-3.5 py-1.5 rounded-full"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            <section className="mt-7">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7b81a6] mb-3">
                Описание
              </h3>
              {loading && !overview ? (
                <Skeleton />
              ) : (
                <p className="text-sm sm:text-[15px] text-[#d0d3ea] leading-[1.75] whitespace-pre-line">
                  {overview || "Описание отсутствует"}
                </p>
              )}
            </section>

            {(directors.length > 0 || trailer) && (
              <dl className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
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
                      className="inline-flex items-center gap-2 text-[#ff935f] hover:underline"
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
              <section className="mt-8">
                <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7b81a6] mb-3.5">
                  В ролях
                </h3>
                <ul className="no-scrollbar flex gap-3.5 overflow-x-auto scroll-contain pb-2 -mx-[18px] px-[18px] sm:mx-0 sm:px-0">
                  {cast.map((person) => (
                    <CastMember key={person.credit_id || person.id} person={person} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {listsOpen && (
          <div className="shrink-0 border-t border-white/[0.07] bg-[#171b38] px-4 sm:px-10 py-4 max-h-[40dvh] overflow-y-auto scroll-contain">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7b81a6]">Добавить в общий список</h3>
              <button type="button" onClick={() => setListsOpen(false)} aria-label="Скрыть общие списки" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.08]">
                <Icon n="x" className="w-4 h-4 opacity-70" />
              </button>
            </div>
            {lists === null ? (
              <p className="text-sm text-[#8b91b5]">Загружаю списки…</p>
            ) : listsError ? (
              <p className="text-sm text-red-300">{listsError}</p>
            ) : lists.length === 0 ? (
              <p className="text-sm text-[#8b91b5]">Общих списков пока нет. Создай их во вкладке «Смотрим вместе».</p>
            ) : (
              <ul className="space-y-1.5">
                {lists.map((l) => {
                  const st = listStatus[l.id];
                  const done = st === "added" || st === "exists";
                  return (
                    <li key={l.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2 pl-3.5">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-white truncate">{l.name}</span>
                        <span className={`block text-xs ${st && !done && st !== "adding" ? "text-red-300" : "text-[#8b91b5]"}`}>
                          {st === "added" ? "Добавлено" : st === "exists" ? "Уже есть в этом списке" : st && st !== "adding" ? st : `${l.members.length} участн.`}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={done || st === "adding"}
                        onClick={() => addToList(l)}
                        aria-label={`Добавить в список ${l.name}`}
                        className={`shrink-0 h-10 px-4 rounded-xl text-[13px] inline-flex items-center gap-1.5 disabled:opacity-60 ${done ? "bg-emerald-400/[0.14] text-[#58dcaa] font-bold" : BTN_ORANGE}`}
                      >
                        <Icon n={done ? "check" : "plus"} className={`w-4 h-4 ${done ? "[filter:invert(1)_sepia(1)_saturate(3)_hue-rotate(100deg)]" : DARK_ICON}`} />
                        {done ? "Готово" : "Добавить"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Кнопки всегда под рукой, даже когда описание длинное */}
        <div className="shrink-0 flex gap-2.5 border-t border-white/[0.07] bg-[#12152a] px-4 sm:px-10 pt-3 sm:pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
          {existing ? (
            <button
              type="button"
              onClick={() => {
                onOpenReview(existing.id);
                onClose();
              }}
              className={`flex-1 inline-flex items-center justify-center gap-2 h-[52px] px-4 rounded-[14px] text-[15px] ${BTN_ORANGE}`}
            >
              <Icon n="message-square-text" className={`w-[18px] h-[18px] ${DARK_ICON}`} />
              Оценка и отзыв
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleAdd("WATCHED")}
                className="flex-1 inline-flex items-center justify-center gap-2 h-[52px] px-4 rounded-[14px] text-[15px] font-extrabold transition-colors bg-emerald-400/[0.16] hover:bg-emerald-400/25 text-[#58dcaa]"
              >
                <Icon n="check" className="w-[18px] h-[18px] [filter:invert(1)_sepia(1)_saturate(3)_hue-rotate(100deg)]" /> Смотрел
              </button>
              <button
                type="button"
                onClick={() => handleAdd("WATCHLIST")}
                className={`flex-1 inline-flex items-center justify-center gap-2 h-[52px] px-4 rounded-[14px] text-[15px] ${BTN_ORANGE}`}
              >
                <Icon n="bookmark" className={`w-[18px] h-[18px] ${DARK_ICON}`} /> В список
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleLists}
            aria-expanded={listsOpen}
            aria-label="В общий список"
            title="В общий список с друзьями"
            className={`shrink-0 inline-flex items-center justify-center gap-2 h-[52px] w-[52px] sm:w-auto sm:px-5 rounded-[14px] text-[15px] ${listsOpen ? "bg-[#ff7a45]/[0.16] text-[#ff9a6c] font-bold" : BTN_SOFT}`}
          >
            <Icon n="popcorn" className={`w-[18px] h-[18px] ${listsOpen ? ORANGE_FILTER : ""}`} />
            <span className="hidden sm:inline">Вместе</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`hidden sm:inline-flex items-center justify-center h-[52px] px-7 rounded-[14px] text-[15px] ${BTN_SOFT}`}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
