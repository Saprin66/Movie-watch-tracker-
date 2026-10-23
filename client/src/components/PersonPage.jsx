import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { Chip, Grid, MovieCard, Poster, SubTabs } from "./ui";
import { POSTER, POSTER_LARGE, TMDB, TMDB_API_KEY } from "../config";
import { useScrollLock } from "../hooks/useScrollLock";
import { useBackClose } from "../hooks/useBackClose";

const DEPARTMENTS = {
  Acting: "Актёр",
  Directing: "Режиссёр",
  Writing: "Сценарист",
  Production: "Продюсер",
  Sound: "Композитор",
  Camera: "Оператор",
};

// Разделы фильмографии: роли и основные должности в съёмочной группе
const ROLE_TABS = [
  { id: "cast", label: "Актёр" },
  { id: "Director", label: "Режиссёр" },
  { id: "Writer", label: "Сценарист", jobs: ["Writer", "Screenplay", "Story", "Novel"] },
  { id: "Producer", label: "Продюсер", jobs: ["Producer", "Executive Producer"] },
];

// Появления «в роли себя» (ток-шоу, документалки) — не роли, в фильмографию не берём
const SELF_ROLE = /^(self|himself|herself|themselves|сам|сама)\b/i;

const yearOf = (item) => (item.release_date || item.first_air_date || "").slice(0, 4);
const typeOf = (item) => (item.media_type === "tv" ? "tv" : "movie");

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

async function loadPerson(id) {
  const url = (lang) =>
    `${TMDB}/person/${id}?api_key=${TMDB_API_KEY}&language=${lang}&append_to_response=combined_credits`;
  const res = await fetch(url("ru-RU"));
  if (!res.ok) throw new Error(`TMDB ответил ${res.status}`);
  const data = await res.json();
  // Биографии на русском часто нет — берём английскую
  if (!data.biography) {
    const en = await fetch(`${TMDB}/person/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (en?.biography) data.biography = en.biography;
  }
  // Возраст считаем при загрузке, а не при каждой отрисовке
  if (data.birthday && !data.deathday) {
    data.age = Math.floor((Date.now() - new Date(data.birthday).getTime()) / (365.25 * 24 * 3600 * 1000));
  }
  return data;
}

// Фильмография по разделу: без дублей, от новых к старым, ещё не вышедшее — в конце
function filmography(credits, tab) {
  const source =
    tab.id === "cast"
      ? credits?.cast || []
      : (credits?.crew || []).filter((c) => (tab.jobs || [tab.id]).includes(c.job));
  const byKey = new Map();
  for (const item of source) {
    if (item.media_type !== "movie" && item.media_type !== "tv") continue;
    if (tab.id === "cast" && SELF_ROLE.test(item.character || "")) continue;
    const key = `${item.media_type}-${item.id}`;
    const prev = byKey.get(key);
    // У сериалов одна роль может быть записана несколько раз — склеиваем
    if (prev) {
      if (item.character && !prev.character?.includes(item.character)) {
        prev.character = [prev.character, item.character].filter(Boolean).join(", ");
      }
    } else {
      byKey.set(key, { ...item });
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const ya = yearOf(a) || "9999";
    const yb = yearOf(b) || "9999";
    return yb.localeCompare(ya);
  });
}

// Страница актёра или режиссёра: фото, биография и фильмография с отметками «уже смотрел»
export default function PersonPage({ person, movies, onClose, onOpenMovie, historyKey }) {
  useScrollLock();
  const { leaving, close } = useBackClose(historyKey, onClose);
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [bioOpen, setBioOpen] = useState(false);
  const [tabId, setTabId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadPerson(person.id)
      .then((data) => !cancelled && setState({ loading: false, data, error: "" }))
      .catch((error) => !cancelled && setState({ loading: false, data: null, error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { loading, data, error } = state;
  const name = data?.name || person.name;
  const photoPath = data?.profile_path || person.profile_path;
  const photo = photoPath ? `${POSTER_LARGE}${photoPath}` : null;

  // Записи журнала по ключу «movie-123», чтобы отметить уже просмотренное
  const journal = useMemo(
    () => new Map(movies.map((m) => [`${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`, m])),
    [movies],
  );

  const tabs = ROLE_TABS.map((t) => ({ ...t, items: filmography(data?.combined_credits, t) })).filter(
    (t) => t.items.length > 0,
  );
  // По умолчанию — основная профессия человека
  const mainTab = { Directing: "Director", Writing: "Writer", Production: "Producer" }[data?.known_for_department] || "cast";
  const defaultTab = tabs.find((t) => t.id === mainTab)?.id || tabs[0]?.id;
  const activeTab = tabs.find((t) => t.id === (tabId || defaultTab));

  const allKeys = new Set(tabs.flatMap((t) => t.items.map((i) => `${i.media_type}-${i.id}`)));
  const watchedCount = [...allKeys].filter((k) => journal.get(k)?.status === "WATCHED").length;

  const born = data?.birthday
    ? new Date(data.birthday).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const age = data?.age ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className={`fixed inset-0 z-50 bg-[#080a16] overflow-hidden ${leaving ? "mg-page-leave" : "mg-page-enter"}`}
    >
      {/* Фон: фото сверху, слегка размыто и уходит в тёмный фон */}
      <div className="absolute inset-x-0 top-0 h-[70vh] overflow-hidden" aria-hidden="true">
        {photo && (
          <img src={photo} alt="" className="mg-page-bg absolute inset-0 w-full h-full object-cover object-top blur-[6px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080a16]/45 via-[#080a16]/60 via-45% to-[#080a16]" />
      </div>

      <div className="relative h-full overflow-y-auto scroll-contain">
        <div className="sticky top-0 z-20 flex items-center px-4 sm:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={close}
            aria-label="Назад"
            className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
          >
            <Icon n="arrow-left" className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-8 pb-[calc(3rem+env(safe-area-inset-bottom))]">
          <div className="flex flex-col items-center text-center">
            <div className="mg-page-poster w-[150px] sm:w-[190px] aspect-[2/3] overflow-hidden rounded-[22px] border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
              <Poster src={photo} title={name} />
            </div>
            <h1
              className="mg-page-rise mt-5 max-w-[760px] font-display text-[26px] sm:text-[36px] font-bold text-white leading-[1.1] break-words"
              style={{ animationDelay: "80ms" }}
            >
              {name}
            </h1>
            <div className="mg-page-rise mt-4 flex flex-wrap justify-center gap-2" style={{ animationDelay: "140ms" }}>
              {data?.known_for_department && (
                <span className="mg-glass-chip mg-glass-chip--orange">
                  {DEPARTMENTS[data.known_for_department] || data.known_for_department}
                </span>
              )}
              {born && (
                <span className="mg-glass-chip">
                  <Icon n="cake" className="w-3.5 h-3.5 opacity-80" />
                  {born}
                  {age !== null && ` · ${age} ${plural(age, "год", "года", "лет")}`}
                </span>
              )}
              {data?.place_of_birth && (
                <span className="mg-glass-chip">
                  <Icon n="map-pin" className="w-3.5 h-3.5 opacity-80" />
                  {data.place_of_birth}
                </span>
              )}
              {allKeys.size > 0 && (
                <span className="mg-glass-chip mg-glass-chip--green">
                  <Icon n="check" className="w-3.5 h-3.5" />
                  Вы смотрели {watchedCount} из {allKeys.size}
                </span>
              )}
            </div>
          </div>

          <div className="mg-page-rise mx-auto mt-8 max-w-5xl space-y-5" style={{ animationDelay: "200ms" }}>
            {error ? (
              <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                Не удалось загрузить данные: {error}
              </p>
            ) : (
              <section className="mx-auto max-w-[760px] mg-glass-panel rounded-[24px] p-5 sm:p-7">
                <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4]">Биография</h2>
                {loading ? (
                  <div className="space-y-2.5 animate-pulse" aria-hidden="true">
                    <div className="h-3 rounded bg-white/10 w-full" />
                    <div className="h-3 rounded bg-white/10 w-11/12" />
                    <div className="h-3 rounded bg-white/10 w-9/12" />
                  </div>
                ) : data?.biography ? (
                  <>
                    <p
                      className={`text-sm sm:text-[15px] text-[#e2e4f3] leading-[1.75] whitespace-pre-line ${bioOpen ? "" : "line-clamp-5"}`}
                    >
                      {data.biography}
                    </p>
                    {data.biography.length > 320 && (
                      <button
                        type="button"
                        onClick={() => setBioOpen((v) => !v)}
                        className="mt-2 text-sm font-bold text-[#ff935f] hover:text-[#ffb08c]"
                      >
                        {bioOpen ? "Свернуть" : "Читать полностью"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[#aeb3d6]">Биографии пока нет.</p>
                )}
              </section>
            )}

            {activeTab && (
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-[19px] font-semibold text-white">
                    Фильмография <span className="text-[#9aa0c4]">· {activeTab.items.length}</span>
                  </h2>
                  {tabs.length > 1 && (
                    <SubTabs
                      items={tabs.map((t) => ({ id: t.id, label: t.label }))}
                      active={activeTab.id}
                      onChange={setTabId}
                      className="flex w-full sm:w-auto"
                      itemClass="sm:w-[130px] !px-1.5 text-[13px] sm:text-sm"
                    />
                  )}
                </div>
                <Grid>
                  {activeTab.items.map((item) => {
                    const entry = journal.get(`${item.media_type}-${item.id}`);
                    const year = yearOf(item);
                    return (
                      <MovieCard
                        key={`${item.media_type}-${item.id}`}
                        poster={item.poster_path ? `${POSTER}${item.poster_path}` : null}
                        title={item.title || item.name}
                        chips={
                          <>
                            {entry?.status === "WATCHED" && (
                              <Chip tone="green">
                                <Icon n="check" className="w-3 h-3 -mt-0.5 inline [filter:invert(1)_sepia(1)_saturate(3)_hue-rotate(100deg)]" />
                                {entry.rating ? ` ${entry.rating}` : " Смотрел"}
                              </Chip>
                            )}
                            {entry?.status === "WATCHLIST" && <Chip tone="blue">В списке</Chip>}
                            {typeOf(item) === "tv" && <Chip tone="orange">Сериал</Chip>}
                          </>
                        }
                        footerLeft={
                          <span className="truncate">
                            {year || "Скоро"}
                            {/* Должность и так видна по вкладке — показываем только роль */}
                            {activeTab.id === "cast" && item.character ? ` · ${item.character}` : ""}
                          </span>
                        }
                        onClick={() =>
                          onOpenMovie({
                            id: item.id,
                            media_type: typeOf(item),
                            title: item.title || item.name,
                            poster_path: item.poster_path,
                          })
                        }
                      />
                    );
                  })}
                </Grid>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
