import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Poster } from "./ui";
import { DARK_ICON, ORANGE_FILTER } from "./styles";
import { POSTER_LARGE, PROFILE } from "../config";
import { fetchTmdb } from "../utils/tmdb";
import { useScrollLock } from "../hooks/useScrollLock";
import { useAuth } from "../context/AuthContext";
import { itemFromTmdb, listsRequest } from "../utils/listsApi";

const DETAILS_PARAMS =
  "&language=ru-RU&append_to_response=credits,videos,release_dates,content_ratings&include_video_language=ru,en,null";

// Длительность анимации закрытия страницы, мс (совпадает с .mg-page-leave в index.css)
const LEAVE_MS = 260;

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

// Американские рейтинги переводим в привычный формат «16+»
const US_TO_AGE = {
  G: "0+", PG: "6+", "PG-13": "12+", R: "18+", "NC-17": "18+",
  "TV-Y": "0+", "TV-Y7": "6+", "TV-G": "0+", "TV-PG": "12+", "TV-14": "16+", "TV-MA": "18+",
};

function ageRating(details, isTv) {
  if (!details) return null;
  const pick = (country) => {
    if (isTv) {
      return (details.content_ratings?.results || []).find((r) => r.iso_3166_1 === country)
        ?.rating;
    }
    const entry = (details.release_dates?.results || []).find((r) => r.iso_3166_1 === country);
    return entry?.release_dates?.find((d) => d.certification)?.certification;
  };
  const ru = pick("RU");
  if (ru) return /^\d+$/.test(ru) ? `${ru}+` : ru;
  const us = pick("US");
  return us ? US_TO_AGE[us] || us : null;
}

// Год выхода, а для ещё не вышедших — дата премьеры
function releaseLabel(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  if (date > new Date()) {
    return `Премьера ${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
  }
  return String(date.getFullYear());
}

function Skeleton() {
  return (
    <div className="space-y-2.5 animate-pulse" aria-hidden="true">
      <div className="h-3 rounded bg-white/10 w-full" />
      <div className="h-3 rounded bg-white/10 w-11/12" />
      <div className="h-3 rounded bg-white/10 w-9/12" />
    </div>
  );
}

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4] mb-1.5">
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
          className="w-[68px] h-[68px] mx-auto rounded-full object-cover border-2 border-white/20"
        />
      ) : (
        <div className="w-[68px] h-[68px] mx-auto rounded-full bg-gradient-to-br from-[#ff7a45]/70 to-[#8b5cf6]/70 border-2 border-white/20 flex items-center justify-center text-lg font-extrabold text-white">
          {person.name?.[0] || "?"}
        </div>
      )}
      <div className="mt-2.5 text-xs font-bold leading-tight text-[#e9ebf7] line-clamp-2">
        {person.name}
      </div>
      {person.character && (
        <div className="mt-0.5 text-[11px] leading-tight text-[#9aa0c4] line-clamp-2">
          {person.character}
        </div>
      )}
    </li>
  );
}

const SECTION_LABEL =
  "text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4] mb-3";

// Страница фильма или сериала из TMDB, открывается поверх приложения на весь экран.
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
  const [leaving, setLeaving] = useState(false);

  // Свежий onClose без переподписки на события
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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

  // Страница добавляет запись в историю: системная кнопка/жест «Назад» закрывает её,
  // а не уводит с сайта
  useEffect(() => {
    if (!window.history.state?.mgDetails) {
      window.history.pushState({ ...window.history.state, mgDetails: true }, "");
    }
    let timer;
    const onPop = () => {
      setLeaving(true);
      timer = setTimeout(() => onCloseRef.current(), LEAVE_MS);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      clearTimeout(timer);
    };
  }, []);

  const close = () => {
    if (window.history.state?.mgDetails) window.history.back();
    else onClose();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { loading, details } = state;
  const isTv = type === "tv";

  // Пока детали грузятся (или не загрузились), показываем то, что уже есть из поиска
  const data = details || movie;
  const title = data.title || data.name || movie.title || movie.name;
  const originalTitle = data.original_title || data.original_name;
  const posterPath = data.poster_path || movie.poster_path;
  const posterSrc = posterPath ? `${POSTER_LARGE}${posterPath}` : movie.posterUrl || null;
  const overview = data.overview || movie.overview;
  const rating = data.vote_average ? Number(data.vote_average).toFixed(1) : null;
  const runtime = formatRuntime(details);
  const age = ageRating(details, isTv);
  const release = releaseLabel(data.release_date || data.first_air_date);
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
    close();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-50 bg-[#080a16] overflow-hidden ${leaving ? "mg-page-leave" : "mg-page-enter"}`}
    >
      {/* Фон: размытый постер */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {posterSrc && (
          <img
            src={posterSrc}
            alt=""
            className="mg-page-bg absolute inset-0 w-full h-full object-cover scale-125 blur-[40px] opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080a16]/30 via-[#080a16]/70 to-[#080a16]" />
      </div>

      <div className="relative h-full overflow-y-auto scroll-contain">
        {/* Верхняя панель */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={close}
            aria-label="Назад"
            className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
          >
            <Icon n="arrow-left" className="w-5 h-5" />
          </button>
          {trailer && (
            <a
              href={`https://www.youtube.com/watch?v=${trailer.key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mg-glass-btn mg-glass-btn--wide h-11 px-4 rounded-full inline-flex items-center gap-2 text-sm font-bold text-white"
            >
              <Icon n="play" className="w-4 h-4" /> Трейлер
            </a>
          )}
        </div>

        <div className="px-4 sm:px-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
          {/* Постер и главное по центру */}
          <div className="flex flex-col items-center text-center">
            <div className="mg-page-poster w-[190px] sm:w-[240px] aspect-[2/3] overflow-hidden rounded-[22px] border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
              <Poster src={posterSrc} title={title} />
            </div>

            <div className="mg-page-rise mt-6 max-w-[760px]" style={{ animationDelay: "80ms" }}>
              <h1 className="font-display text-[26px] sm:text-[38px] font-bold text-white leading-[1.1] break-words">
                {title}
              </h1>
              {originalTitle && originalTitle !== title && (
                <div className="mt-2 text-[13px] sm:text-sm text-[#b8bddb] break-words">
                  {originalTitle}
                </div>
              )}
            </div>

            <div
              className="mg-page-rise mt-5 flex flex-wrap items-center justify-center gap-2"
              style={{ animationDelay: "140ms" }}
            >
              {rating && (
                <span className="mg-glass-chip mg-glass-chip--orange">
                  <Icon n="star" className={`w-4 h-4 ${ORANGE_FILTER}`} />
                  {rating}
                </span>
              )}
              {age && <span className="mg-glass-chip">{age}</span>}
              {runtime && (
                <span className="mg-glass-chip">
                  <Icon n="clock" className="w-3.5 h-3.5 opacity-80" />
                  {runtime}
                </span>
              )}
              {release && (
                <span className="mg-glass-chip">
                  <Icon n="calendar" className="w-3.5 h-3.5 opacity-80" />
                  {release}
                </span>
              )}
              {isTv && details?.number_of_seasons > 0 && (
                <span className="mg-glass-chip">
                  {details.number_of_seasons} {pluralSeasons(details.number_of_seasons)}
                </span>
              )}
            </div>

            {existing && (
              <div
                className="mg-page-rise mt-4 flex flex-wrap items-center justify-center gap-2 text-sm"
                style={{ animationDelay: "180ms" }}
              >
                <span
                  className={`mg-glass-chip ${existing.status === "WATCHED" ? "mg-glass-chip--green" : "mg-glass-chip--orange"}`}
                >
                  {existing.status === "WATCHED" ? "Просмотрено" : "Буду смотреть"}
                  {existing.rating && ` · ваша оценка ${existing.rating}/10`}
                </span>
              </div>
            )}
          </div>

          {/* Подробности */}
          <div
            className="mg-page-rise mx-auto mt-8 max-w-[760px] space-y-4"
            style={{ animationDelay: "220ms" }}
          >
            <section className="mg-glass-panel rounded-[24px] p-5 sm:p-7">
              {details?.tagline && (
                <p className="mb-4 text-sm sm:text-[15px] italic text-[#c4c8e4]">
                  {/* TMDB иногда присылает слоган уже в кавычках */}
                  «{details.tagline.replace(/^[«"“„]+|[»"”]+$/g, "")}»
                </p>
              )}
              {genres.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <span key={g.id} className="mg-glass-chip text-xs py-1.5">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}
              <h2 className={SECTION_LABEL}>Описание</h2>
              {loading && !overview ? (
                <Skeleton />
              ) : (
                <p className="text-sm sm:text-[15px] text-[#e2e4f3] leading-[1.75] whitespace-pre-line">
                  {overview || "Описание отсутствует"}
                </p>
              )}

              {directors.length > 0 && (
                <dl className="mt-6">
                  <Fact label={isTv ? "Создатели" : "Режиссёр"}>{directors.join(", ")}</Fact>
                </dl>
              )}
            </section>

            {cast.length > 0 && (
              <section className="mg-glass-panel rounded-[24px] p-5 sm:p-7">
                <h2 className={SECTION_LABEL}>В ролях</h2>
                <ul className="no-scrollbar flex gap-3.5 overflow-x-auto scroll-contain pb-1 -mx-5 px-5 sm:-mx-7 sm:px-7">
                  {cast.map((person) => (
                    <CastMember key={person.credit_id || person.id} person={person} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Действия: стеклянная панель внизу, всегда под рукой */}
      <div className="mg-dock-bottom absolute z-20 left-3 right-3 mx-auto max-w-[560px]">
        {listsOpen && (
          <div className="mg-glass-nav mg-page-rise mb-2 rounded-[24px] p-4 max-h-[45dvh] overflow-y-auto scroll-contain">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#c4c8e4]">Добавить в общий список</h3>
              <button type="button" onClick={() => setListsOpen(false)} aria-label="Скрыть общие списки" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.1]">
                <Icon n="x" className="w-4 h-4 opacity-70" />
              </button>
            </div>
            {lists === null ? (
              <p className="text-sm text-[#c4c8e4]">Загружаю списки…</p>
            ) : listsError ? (
              <p className="text-sm text-red-300">{listsError}</p>
            ) : lists.length === 0 ? (
              <p className="text-sm text-[#c4c8e4]">Общих списков пока нет. Создай их во вкладке «Смотрим вместе».</p>
            ) : (
              <ul className="space-y-1.5">
                {lists.map((l) => {
                  const st = listStatus[l.id];
                  const done = st === "added" || st === "exists";
                  return (
                    <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2 pl-3.5">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-white truncate">{l.name}</span>
                        <span className={`block text-xs ${st && !done && st !== "adding" ? "text-red-300" : "text-[#aeb3d6]"}`}>
                          {st === "added" ? "Добавлено" : st === "exists" ? "Уже есть в этом списке" : st && st !== "adding" ? st : `${l.members.length} участн.`}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={done || st === "adding"}
                        onClick={() => addToList(l)}
                        aria-label={`Добавить в список ${l.name}`}
                        className={`mg-glass-btn mg-glass-btn--wide shrink-0 h-10 px-4 rounded-full text-[13px] font-bold text-white inline-flex items-center gap-1.5 disabled:opacity-70 ${done ? "mg-glass-btn--green" : "mg-glass-btn--orange"}`}
                      >
                        <Icon n={done ? "check" : "plus"} className="w-4 h-4" />
                        {done ? "Готово" : "Добавить"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        <div className="mg-glass-nav rounded-full p-1.5 flex gap-1.5">
          {existing ? (
            <button
              type="button"
              onClick={() => {
                onOpenReview(existing.id);
                close();
              }}
              className="flex-1 min-w-0 whitespace-nowrap inline-flex items-center justify-center gap-2 h-12 px-3 rounded-full text-sm sm:text-[15px] font-extrabold text-[#1b0d07] bg-[#ff7a45] hover:bg-[#ff8a5a] transition-colors"
            >
              <Icon n="message-square-text" className={`w-[18px] h-[18px] ${DARK_ICON}`} />
              Оценка и отзыв
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleAdd("WATCHLIST")}
                className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--orange flex-1 min-w-0 whitespace-nowrap inline-flex items-center justify-center gap-2 h-12 px-3 rounded-full text-sm sm:text-[15px] font-extrabold text-white"
              >
                <Icon n="eye" className="w-[18px] h-[18px]" /> Буду смотреть
              </button>
              <button
                type="button"
                onClick={() => handleAdd("WATCHED")}
                className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--green flex-1 min-w-0 whitespace-nowrap inline-flex items-center justify-center gap-2 h-12 px-3 rounded-full text-sm sm:text-[15px] font-extrabold text-white"
              >
                <Icon n="check" className="w-[18px] h-[18px]" /> Смотрел
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleLists}
            aria-expanded={listsOpen}
            aria-label="В общий список"
            title="В общий список с друзьями"
            className={`mg-glass-btn shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${listsOpen ? "mg-glass-btn--orange" : ""}`}
          >
            <Icon n="popcorn" className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
