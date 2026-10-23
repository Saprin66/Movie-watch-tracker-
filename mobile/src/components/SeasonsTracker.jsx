import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { tmdb } from "../lib/tmdb";
import { COLORS, Icon } from "./ui";

const keyOf = (season, episode) => `${season}-${episode}`;
const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (date, options) => new Date(date).toLocaleDateString("ru-RU", options);

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

const Bar = ({ percent, className }) => (
  <View className="h-full rounded-full overflow-hidden bg-white/[0.08]">
    <View className={`h-full rounded-full ${className}`} style={{ width: `${percent}%` }} />
  </View>
);

// Учёт серий сериала из журнала: сезоны, отметки серий и «следующая серия»
export default function SeasonsTracker({ entry, details }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
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
    api(`/api/movies/${entry.id}/episodes`, { token })
      .then((rows) => !cancelled && setWatched(new Set(rows.map((r) => keyOf(r.season, r.episode)))))
      .catch((e) => {
        if (cancelled) return;
        setWatched(new Set());
        setError(e.message || "Не удалось загрузить серии");
      });
    return () => {
      cancelled = true;
    };
  }, [entry.id, token]);

  const loadSeason = async (number) => {
    if (episodesBySeason[number]) return episodesBySeason[number];
    const data = await tmdb(`/tv/${details.id}/season/${number}`);
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
      } catch {
        setError("Не удалось загрузить серии сезона");
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
      const rows = await api(`/api/movies/${entry.id}/episodes`, {
        token,
        method: "PUT",
        body: {
          watched: mark,
          episodes: episodes.map((ep) => ({
            season: ep.season_number,
            episode: ep.episode_number,
            runtime: ep.runtime ?? details?.episode_run_time?.[0] ?? null,
          })),
        },
      });
      setWatched(new Set(rows.map((r) => keyOf(r.season, r.episode))));
      // В журнале меняются счётчики серий и время просмотра
      queryClient.invalidateQueries({ queryKey: ["movies"] });
    } catch (e) {
      setWatched(before);
      setError(e.message || "Не удалось сохранить");
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
    <View className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-[#7b81a6]">Сезоны и серии</Text>
        {watched && (
          <Text className="text-xs font-bold text-soft bg-white/[0.07] px-2.5 py-0.5 rounded-full overflow-hidden">
            {Math.min(watchedCount, totalAired)} из {totalAired}
          </Text>
        )}
      </View>

      {watched && totalAired > 0 && (
        <View className="h-2 mb-4">
          <Bar percent={Math.min(100, (watchedCount / totalAired) * 100)} className="bg-accent" />
        </View>
      )}

      {!watched && <ActivityIndicator color={COLORS.accent} className="mb-3" />}

      {/* Следующая серия */}
      {next && !next.done && (
        <View className="mb-4 flex-row items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3 pl-4">
          <View className="flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-accent-light">
              Следующая серия
            </Text>
            <Text className="mt-0.5 text-sm font-bold text-white">
              Сезон {next.season}, серия {next.episode}
            </Text>
            {nextEpisodeData?.name ? (
              <Text numberOfLines={1} className="text-xs text-soft">
                {nextEpisodeData.name}
              </Text>
            ) : null}
          </View>
          <Pressable
            disabled={busy}
            onPress={() => markNext(next)}
            className={`h-10 px-4 rounded-full flex-row items-center gap-1.5 bg-emerald-400/[0.16] active:opacity-80 ${busy ? "opacity-60" : ""}`}
          >
            <Icon name="check" size={16} color={COLORS.green} />
            <Text className="text-[13px] font-extrabold text-[#58dcaa]">Посмотрел</Text>
          </Pressable>
        </View>
      )}
      {next?.done && watchedCount > 0 && (
        <Text className="mb-4 rounded-2xl bg-emerald-400/[0.1] border border-emerald-400/20 px-4 py-3 text-sm text-[#8ef0c8] overflow-hidden">
          Все вышедшие серии просмотрены
          {nextToAir?.air_date
            ? ` · новая серия ${formatDate(nextToAir.air_date, { day: "numeric", month: "long" })}`
            : ""}
        </Text>
      )}

      {error ? <Text className="mb-3 text-sm text-red-300">{error}</Text> : null}

      <View className="gap-2">
        {seasons.map((season) => {
          const aired = airedInSeason(season, lastAired);
          const seen = watched
            ? [...watched].filter((k) => k.startsWith(`${season.season_number}-`)).length
            : 0;
          const isOpen = open === season.season_number;
          const episodes = episodesBySeason[season.season_number];
          const airedEpisodes = (episodes || []).filter((ep) => isAired(ep, lastAired));
          const allSeen =
            airedEpisodes.length > 0 &&
            airedEpisodes.every((ep) => watched?.has(keyOf(ep.season_number, ep.episode_number)));
          return (
            <View
              key={season.season_number}
              className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden"
            >
              <Pressable
                onPress={() => toggleSeasonOpen(season.season_number)}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-white/[0.04]"
              >
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-extrabold text-white">
                    {season.name || `Сезон ${season.season_number}`}
                  </Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <View className="h-1.5 w-24">
                      <Bar percent={aired ? Math.min(100, (seen / aired) * 100) : 0} className="bg-[#58dcaa]" />
                    </View>
                    <Text className="flex-1 text-xs text-soft">
                      {seen}/{aired || season.episode_count}
                      {aired < season.episode_count && aired > 0 ? ` · ещё ${season.episode_count - aired} впереди` : ""}
                      {aired === 0 ? " · ещё не вышел" : ""}
                    </Text>
                  </View>
                </View>
                <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.muted} />
              </Pressable>

              {isOpen && (
                <View className="border-t border-white/[0.08] px-2 pb-2">
                  {!episodes ? (
                    <Text className="px-2 py-3 text-sm text-soft">Загружаю серии…</Text>
                  ) : (
                    <>
                      {airedEpisodes.length > 0 && (
                        <Pressable
                          disabled={busy}
                          onPress={() => save(airedEpisodes, !allSeen)}
                          className="self-end px-2 py-2.5"
                        >
                          <Text className="text-xs font-bold text-accent-light">
                            {allSeen ? "Снять отметки с сезона" : "Отметить весь сезон"}
                          </Text>
                        </Pressable>
                      )}
                      {episodes.map((ep) => {
                        const key = keyOf(ep.season_number, ep.episode_number);
                        const seenEp = watched?.has(key);
                        const out = isAired(ep, lastAired);
                        return (
                          <Pressable
                            key={key}
                            disabled={!out || busy}
                            onPress={() => save([ep], !seenEp)}
                            className="flex-row items-center gap-3 rounded-xl px-2 py-2.5 active:bg-white/[0.05]"
                          >
                            <View
                              className={`w-8 h-8 rounded-full items-center justify-center border ${
                                seenEp ? "bg-emerald-400/80 border-emerald-300" : "bg-white/[0.06] border-white/20"
                              }`}
                            >
                              {seenEp ? (
                                <Icon name="check" size={16} color="#0b1a14" />
                              ) : (
                                <Text className="text-xs font-bold text-[#c4c8e4]">{ep.episode_number}</Text>
                              )}
                            </View>
                            <View className={`flex-1 ${out ? "" : "opacity-50"}`}>
                              <Text numberOfLines={1} className="text-sm font-bold text-white">
                                {ep.name || `Серия ${ep.episode_number}`}
                              </Text>
                              <Text className="text-xs text-[#9aa0c4]">
                                {ep.air_date
                                  ? formatDate(ep.air_date, { day: "numeric", month: "short", year: "numeric" })
                                  : "Дата неизвестна"}
                                {ep.runtime ? ` · ${ep.runtime} мин` : ""}
                                {!out ? " · ещё не вышла" : ""}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
