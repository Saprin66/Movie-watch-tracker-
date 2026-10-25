import { useEffect, useState } from "react";
import Icon from "./Icon";
import { API_URL, TMDB, TMDB_API_KEY } from "../config";
import { useAuth } from "../context/AuthContext";

const keyOf = (season, episode) => `${season}-${episode}`;
const today = () => new Date().toISOString().slice(0, 10);

// Вышла ли серия: без даты считаем вышедшей, если сезон не новее последней вышедшей серии
const isAired = (ep, lastAired) => {
  if (ep.air_date) return ep.air_date <= today();
  if (!lastAired) return false;
  return (
    ep.season_number < lastAired.season_number ||
    (ep.season_number === lastAired.season_number && ep.episode_number <= lastAired.episode_number)
  );
};

// Сколько серий сезона уже вышло (по деталям сериала, без загрузки сезона)
function airedInSeason(season, lastAired) {
  if (!lastAired) return 0;
  if (season.season_number < lastAired.season_number) return season.episode_count || 0;
  if (season.season_number === lastAired.season_number) return lastAired.episode_number;
  return 0;
}

// Следующая серия после последней отмеченной
function nextEpisode(seasons, watched, lastAired) {
  let last = null;
  for (const key of watched) {
    const [s, e] = key.split("-").map(Number);
    if (!last || s > last.s || (s === last.s && e > last.e)) last = { s, e };
  }
  const order = seasons.map((x) => x.season_number);
  let candidate;
  if (!last) {
    candidate = order.length ? { s: order[0], e: 1 } : null;
  } else {
    const season = seasons.find((x) => x.season_number === last.s);
    if (season && last.e < season.episode_count) candidate = { s: last.s, e: last.e + 1 };
    else {
      const nextSeason = order.find((n) => n > last.s);
      candidate = nextSeason !== undefined ? { s: nextSeason, e: 1 } : null;
    }
  }
  if (!candidate) return { done: true };
  const aired =
    lastAired &&
    (candidate.s < lastAired.season_number ||
      (candidate.s === lastAired.season_number && candidate.e <= lastAired.episode_number));
  return aired ? { season: candidate.s, episode: candidate.e } : { done: true };
}

// Учёт серий сериала из журнала: сезоны, отметки серий и «следующая серия»
export default function SeasonsTracker({ entry, tmdbId, details, onChanged }) {
  const { token } = useAuth();
  const [watched, setWatched] = useState(null); // Set ключей «сезон-серия»
  const [open, setOpen] = useState(null); // раскрытый сезон
  const [episodesBySeason, setEpisodesBySeason] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const seasons = (details?.seasons || [])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number);
  const lastAired = details?.last_episode_to_air || null;
  const nextToAir = details?.next_episode_to_air || null;

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/movies/${entry.id}/episodes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Не удалось загрузить серии"))))
      .then((rows) => !cancelled && setWatched(new Set(rows.map((r) => keyOf(r.season, r.episode)))))
      .catch((e) => {
        if (cancelled) return;
        setWatched(new Set());
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [entry.id, token]);

  const loadSeason = async (number) => {
    if (episodesBySeason[number]) return episodesBySeason[number];
    const res = await fetch(`${TMDB}/tv/${tmdbId}/season/${number}?api_key=${TMDB_API_KEY}&language=ru-RU`);
    if (!res.ok) throw new Error("Не удалось загрузить серии сезона");
    const data = await res.json();
    const episodes = data.episodes || [];
    setEpisodesBySeason((prev) => ({ ...prev, [number]: episodes }));
    return episodes;
  };

  const toggleSeasonOpen = async (number) => {
    const next = open === number ? null : number;
    setOpen(next);
    if (next !== null) {
      try {
        await loadSeason(next);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  // Отметить или снять отметку с серий; сразу меняем галочки, при ошибке откатываем
  const save = async (episodes, mark) => {
    if (!episodes.length || busy) return;
    const before = watched;
    const after = new Set(watched);
    for (const ep of episodes) {
      const key = keyOf(ep.season_number, ep.episode_number);
      if (mark) after.add(key);
      else after.delete(key);
    }
    setWatched(after);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/movies/${entry.id}/episodes`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          watched: mark,
          episodes: episodes.map((ep) => ({
            season: ep.season_number,
            episode: ep.episode_number,
            runtime: ep.runtime ?? details?.episode_run_time?.[0] ?? null,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Не удалось сохранить");
      const rows = await res.json();
      setWatched(new Set(rows.map((r) => keyOf(r.season, r.episode))));
      onChanged?.();
    } catch (e) {
      setWatched(before);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const markNext = async (next) => {
    try {
      const episodes = await loadSeason(next.season);
      const ep = episodes.find((x) => x.episode_number === next.episode);
      await save([ep || { season_number: next.season, episode_number: next.episode }], true);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!seasons.length) return null;

  const totalAired = seasons.reduce((sum, s) => sum + airedInSeason(s, lastAired), 0);
  const watchedCount = watched ? watched.size : 0;
  const next = watched ? nextEpisode(seasons, watched, lastAired) : null;
  const nextEpisodeData =
    next && !next.done ? episodesBySeason[next.season]?.find((e) => e.episode_number === next.episode) : null;

  return (
    <section className="mg-glass-panel rounded-[24px] p-5 sm:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">Сезоны и серии</h2>
        {watched && (
          <span className="mg-glass-chip !py-1 !px-2.5 !text-xs">
            {Math.min(watchedCount, totalAired)} из {totalAired}
          </span>
        )}
      </div>

      {watched && totalAired > 0 && (
        <div className="mb-4 h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff7a45] to-[#ffb08c] transition-[width] duration-500"
            style={{ width: `${Math.min(100, (watchedCount / totalAired) * 100)}%` }}
          />
        </div>
      )}

      {/* Следующая серия */}
      {next && !next.done && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/[0.1] p-3 pl-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#ff935f]">Следующая серия</div>
            <div className="mt-0.5 text-sm font-bold text-white">
              Сезон {next.season}, серия {next.episode}
            </div>
            {nextEpisodeData?.name && (
              <div className="truncate text-xs text-[#b4b2bf]">{nextEpisodeData.name}</div>
            )}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => markNext(next)}
            className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--green shrink-0 h-10 px-4 rounded-full inline-flex items-center gap-1.5 text-[13px] font-extrabold text-white disabled:opacity-60"
          >
            <Icon n="check" className="w-4 h-4" /> Посмотрел
          </button>
        </div>
      )}
      {next?.done && watchedCount > 0 && (
        <p className="mb-4 rounded-2xl bg-emerald-400/[0.1] border border-emerald-400/20 px-4 py-3 text-sm text-[#8ef0c8]">
          Все вышедшие серии просмотрены
          {nextToAir?.air_date &&
            ` · новая серия ${new Date(nextToAir.air_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`}
        </p>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}

      <ul className="space-y-2">
        {seasons.map((season) => {
          const aired = airedInSeason(season, lastAired);
          const seen = watched
            ? [...watched].filter((k) => k.startsWith(`${season.season_number}-`)).length
            : 0;
          const isOpen = open === season.season_number;
          const episodes = episodesBySeason[season.season_number];
          const airedEpisodes = (episodes || []).filter((ep) => isAired(ep, lastAired));
          const allSeen = airedEpisodes.length > 0 && airedEpisodes.every((ep) => watched?.has(keyOf(ep.season_number, ep.episode_number)));
          return (
            <li key={season.season_number} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSeasonOpen(season.season_number)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-white truncate">{season.name || `Сезон ${season.season_number}`}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#58dcaa] transition-[width] duration-500"
                        style={{ width: `${aired ? Math.min(100, (seen / aired) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#b4b2bf]">
                      {seen}/{aired || season.episode_count}
                      {aired < season.episode_count && aired > 0 ? ` · ещё ${season.episode_count - aired} впереди` : ""}
                      {aired === 0 ? " · ещё не вышел" : ""}
                    </span>
                  </div>
                </div>
                <Icon n={isOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 opacity-60" />
              </button>

              {isOpen && (
                <div className="mg-page-rise border-t border-white/[0.08] px-2 pb-2">
                  {!episodes ? (
                    <p className="px-2 py-3 text-sm text-[#b4b2bf] animate-pulse">Загружаю серии…</p>
                  ) : (
                    <>
                      {airedEpisodes.length > 0 && (
                        <div className="flex justify-end px-2 pt-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => save(airedEpisodes, !allSeen)}
                            className="text-xs font-bold text-[#ff935f] hover:text-[#ffb08c] disabled:opacity-60"
                          >
                            {allSeen ? "Снять отметки с сезона" : "Отметить весь сезон"}
                          </button>
                        </div>
                      )}
                      <ul>
                        {episodes.map((ep) => {
                          const key = keyOf(ep.season_number, ep.episode_number);
                          const seenEp = watched?.has(key);
                          const out = isAired(ep, lastAired);
                          return (
                            <li key={key}>
                              <button
                                type="button"
                                disabled={!out || busy}
                                onClick={() => save([ep], !seenEp)}
                                aria-pressed={Boolean(seenEp)}
                                className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/[0.05] disabled:hover:bg-transparent transition-colors"
                              >
                                <span
                                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                                    seenEp
                                      ? "bg-emerald-400/80 border-emerald-300"
                                      : "bg-white/[0.06] border-white/20"
                                  }`}
                                >
                                  {seenEp ? (
                                    <Icon n="check" className="w-4 h-4 [filter:brightness(0.1)]" />
                                  ) : (
                                    <span className="text-xs font-bold text-[#cfcdd8]">{ep.episode_number}</span>
                                  )}
                                </span>
                                <span className={`min-w-0 flex-1 ${out ? "" : "opacity-50"}`}>
                                  <span className="block truncate text-sm font-bold text-white">
                                    {ep.name || `Серия ${ep.episode_number}`}
                                  </span>
                                  <span className="block text-xs text-[#a19fad]">
                                    {ep.air_date
                                      ? new Date(ep.air_date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
                                      : "Дата неизвестна"}
                                    {ep.runtime ? ` · ${ep.runtime} мин` : ""}
                                    {!out ? " · ещё не вышла" : ""}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
