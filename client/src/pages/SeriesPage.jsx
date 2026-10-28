import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { Empty, Poster } from "../components/ui";
import { EYEBROW, ORANGE_FILTER, PAGE_TITLE, PANEL, SECTION_TITLE } from "../components/styles";
import { POSTER } from "../config";
import { fetchTmdb } from "../utils/tmdb";
import { episodeLabel, isOngoing, nextAfter, regularSeasons, totalAired } from "../utils/episodes";
import { pluralize as plural } from "../utils/plural";

// Детали сериалов из TMDB живут между заходами на вкладку 10 минут
const DETAILS_TTL = 10 * 60 * 1000;
const detailsCache = new Map();

function loadDetails(tmdbId) {
  const cached = detailsCache.get(tmdbId);
  if (cached && Date.now() - cached.at < DETAILS_TTL) return cached.promise;
  const promise = fetchTmdb("tv", tmdbId, "", "&language=ru-RU")
    .then((found) => (found?.type === "tv" ? found.data : null))
    .catch(() => {
      detailsCache.delete(tmdbId);
      return null;
    });
  detailsCache.set(tmdbId, { at: Date.now(), promise });
  return promise;
}

// Сериал, к которому давно не возвращались, уходит в «Давно не смотрел»
const PAUSED_AFTER_DAYS = 45;
const DAY = 24 * 60 * 60 * 1000;
// Сколько дней серия считается новой
const FRESH_DAYS = 14;

const formatDay = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

function daysAgoText(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date)) / DAY);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 30) return `${days} ${plural(days, "день", "дня", "дней")} назад`;
  const months = Math.floor(days / 30);
  return `${months} ${plural(months, "месяц", "месяца", "месяцев")} назад`;
}

// Где сейчас сериал: смотрю / жду новых серий / досмотрен
function progressOf(entry, details) {
  const seasons = regularSeasons(details);
  const lastAired = details?.last_episode_to_air || null;
  const aired = totalAired(seasons, lastAired);
  const last = entry.lastEpisode ? { s: entry.lastEpisode.season, e: entry.lastEpisode.episode } : null;
  const next = nextAfter(seasons, last, lastAired);
  const watched = Math.min(entry.episodesWatched || 0, aired || Infinity);
  const runtime = details?.episode_run_time?.[0] || lastAired?.runtime || null;

  let state;
  if (!next.done) {
    const idle = entry.lastEpisodeAt && Date.now() - new Date(entry.lastEpisodeAt) > PAUSED_AFTER_DAYS * DAY;
    state = idle ? "paused" : "watching";
  } else {
    state = isOngoing(details) ? "waiting" : "finished";
  }
  // Новая серия вышла недавно и уже после того, как человек отметил последнюю
  const fresh =
    !next.done &&
    lastAired?.air_date &&
    entry.lastEpisodeAt &&
    lastAired.air_date > entry.lastEpisodeAt.slice(0, 10) &&
    Date.now() - new Date(`${lastAired.air_date}T12:00:00`) < FRESH_DAYS * DAY;

  return { state, next, watched, aired, runtime, fresh, upcoming: details?.next_episode_to_air || null };
}

function SeriesCard({ entry, details, progress, busy, onOpen, onMarkNext, onMarkWatched }) {
  const { state, next, watched, aired, fresh, upcoming } = progress;
  const percent = aired ? Math.round((watched / aired) * 100) : 0;

  return (
    <article className={`${PANEL} relative flex gap-3.5 p-3 transition-colors hover:border-[#ff7a45]/40`}>
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 rounded-[inherit]"
        aria-label={`Открыть «${entry.title}»`}
      />
      <div className="relative w-[68px] sm:w-[76px] aspect-[2/3] rounded-xl overflow-hidden shrink-0 pointer-events-none">
        <Poster src={entry.posterUrl || (details?.poster_path ? `${POSTER}${details.poster_path}` : null)} title={entry.title} small />
      </div>

      <div className="relative min-w-0 flex-1 flex flex-col pointer-events-none">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 min-w-0 font-bold text-white leading-snug line-clamp-2">{details?.name || entry.title}</h3>
          {fresh && (
            <span className="shrink-0 rounded-full bg-[#4fd6a0]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#58dcaa]">
              Новая серия
            </span>
          )}
        </div>

        <div className="mt-1 text-xs text-[#8b91b5]">
          {entry.lastEpisode
            ? <>Смотрел {episodeLabel(entry.lastEpisode.season, entry.lastEpisode.episode)}{entry.lastEpisodeAt && <> · {daysAgoText(entry.lastEpisodeAt)}</>}</>
            : "Серии отмечены"}
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <div
            className="h-1.5 flex-1 rounded-full bg-white/[0.07] overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={aired || 0}
            aria-valuenow={watched}
            aria-label="Просмотрено серий"
          >
            <div
              className={`h-full rounded-full ${state === "finished" ? "bg-[#4fd6a0]" : "bg-[#ff7a45]"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-bold text-[#aeb3d6]">
            {aired ? `${watched} из ${aired}` : watched}
          </span>
        </div>

        <div className="mt-auto pt-2.5 flex items-center gap-2 min-h-[36px]">
          {!next.done ? (
            <>
              <span className="text-[13px] text-[#c4c8e4] min-w-0 truncate">
                Дальше <b className="text-white">{episodeLabel(next.season, next.episode)}</b>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={onMarkNext}
                className="pointer-events-auto ml-auto shrink-0 h-9 px-3 rounded-xl bg-[#ff7a45]/15 hover:bg-[#ff7a45]/25 text-[13px] font-bold text-[#ffa27d] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                aria-label={`Отметить ${episodeLabel(next.season, next.episode)} просмотренной`}
              >
                <Icon n={busy ? "loader-circle" : "check"} className={`w-4 h-4 ${ORANGE_FILTER} ${busy ? "animate-spin" : ""}`} />
                Посмотрел
              </button>
            </>
          ) : state === "waiting" ? (
            <span className="text-[13px] text-[#aeb3d6] flex items-center gap-1.5">
              <Icon n="calendar-clock" className="w-4 h-4 opacity-60" />
              {upcoming?.air_date
                ? <>Новая серия <b className="text-white">{formatDay(upcoming.air_date)}</b></>
                : "Ждём новый сезон"}
            </span>
          ) : entry.status !== "WATCHED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkWatched}
              className="pointer-events-auto h-9 px-3 rounded-xl bg-[#4fd6a0]/15 hover:bg-[#4fd6a0]/25 text-[13px] font-bold text-[#58dcaa] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <Icon n="circle-check" className="w-4 h-4" />
              В просмотренное
            </button>
          ) : (
            <span className="text-[13px] font-semibold text-[#58dcaa] flex items-center gap-1.5">
              <Icon n="circle-check" className="w-4 h-4" /> Досмотрен
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

const GROUPS = [
  { id: "watching", title: "Смотрю", icon: "play", hint: "Есть что смотреть дальше" },
  { id: "waiting", title: "Жду новых серий", icon: "calendar-clock", hint: "Всё вышедшее посмотрено" },
  { id: "paused", title: "Давно не смотрел", icon: "pause", hint: `Не отмечал серии больше ${PAUSED_AFTER_DAYS} дней` },
  { id: "finished", title: "Досмотрено", icon: "circle-check", hint: "Сериал закончился, все серии отмечены" },
];

// Вкладка «Сериалы»: всё начатое — с прогрессом, следующей серией и датой выхода новых
export default function SeriesPage({ movies, onOpenEntry, onMarkEpisode, onMarkWatched }) {
  const started = useMemo(
    () => movies.filter((m) => m.mediaType === "tv" && m.tmdbId && m.episodesWatched > 0),
    [movies],
  );
  const [details, setDetails] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [showFinished, setShowFinished] = useState(false);

  const idsKey = started.map((m) => m.tmdbId).join(",");
  useEffect(() => {
    let cancelled = false;
    for (const entry of started) {
      loadDetails(entry.tmdbId).then((data) => {
        if (!cancelled) setDetails((prev) => (prev[entry.tmdbId] === data ? prev : { ...prev, [entry.tmdbId]: data }));
      });
    }
    return () => {
      cancelled = true;
    };
    // список перезапрашивается только когда меняется набор сериалов
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const loading = started.some((m) => !(m.tmdbId in details));
  const rows = started
    // Если TMDB не ответил, сериал не показываем: без деталей не понять, что дальше
    .filter((m) => details[m.tmdbId])
    .map((entry) => ({ entry, details: details[entry.tmdbId], progress: progressOf(entry, details[entry.tmdbId]) }));

  const byGroup = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
  for (const row of rows) byGroup[row.progress.state].push(row);
  const recent = (a, b) => new Date(b.entry.lastEpisodeAt || 0) - new Date(a.entry.lastEpisodeAt || 0);
  byGroup.watching.sort((a, b) => Number(Boolean(b.progress.fresh)) - Number(Boolean(a.progress.fresh)) || recent(a, b));
  byGroup.paused.sort(recent);
  byGroup.finished.sort(recent);
  // Ждём: сначала то, что выйдет раньше
  byGroup.waiting.sort(
    (a, b) => (a.progress.upcoming?.air_date || "9999").localeCompare(b.progress.upcoming?.air_date || "9999") || recent(a, b),
  );

  const run = async (entry, action) => {
    setBusyId(entry.id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-7">
      <div className="text-center">
        <div className={`${EYEBROW} mb-2.5`}>Мой список</div>
        <h1 className={PAGE_TITLE}>Сериалы</h1>
        <p className="mt-2.5 text-sm text-[#8b91b5]">Всё, что ты начал смотреть: где остановился и что дальше</p>
      </div>

      {started.length === 0 ? (
        <Empty text="Здесь появятся сериалы, у которых отмечена хотя бы одна серия. Отмечать серии можно на странице сериала." />
      ) : (
        <>
          {GROUPS.map((group) => {
            const items = byGroup[group.id];
            if (!items.length) return null;
            const collapsed = group.id === "finished" && !showFinished;
            return (
              <section key={group.id} className="space-y-3.5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className={`flex items-center gap-2.5 ${SECTION_TITLE}`}>
                      <Icon n={group.icon} className={`w-5 h-5 ${ORANGE_FILTER}`} />
                      {group.title}
                      <span className="text-sm font-bold text-[#6f759e]">{items.length}</span>
                    </h2>
                    <p className="text-xs text-[#6f759e] mt-1">{group.hint}</p>
                  </div>
                  {group.id === "finished" && (
                    <button
                      type="button"
                      onClick={() => setShowFinished((v) => !v)}
                      aria-expanded={showFinished}
                      className="shrink-0 text-[13px] font-bold text-[#ff935f] hover:text-[#ffb08a]"
                    >
                      {showFinished ? "Скрыть" : "Показать"}
                    </button>
                  )}
                </div>
                {!collapsed && (
                  <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {items.map(({ entry, details: d, progress }) => (
                      <SeriesCard
                        key={entry.id}
                        entry={entry}
                        details={d}
                        progress={progress}
                        busy={busyId === entry.id}
                        onOpen={() => onOpenEntry(entry)}
                        onMarkNext={() =>
                          run(entry, () =>
                            onMarkEpisode(entry, {
                              season: progress.next.season,
                              episode: progress.next.episode,
                              ...(progress.runtime ? { runtime: progress.runtime } : {}),
                            }),
                          )
                        }
                        onMarkWatched={() => run(entry, () => onMarkWatched(entry))}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {loading && <p className="text-center text-sm text-[#8b91b5] animate-pulse">Загружаем сериалы…</p>}
        </>
      )}
    </div>
  );
}
