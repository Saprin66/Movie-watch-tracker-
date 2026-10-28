// Расчёты по сериям сериала из деталей TMDB (seasons, last_episode_to_air)

export const today = () => new Date().toISOString().slice(0, 10);

// Сезоны без спецвыпусков и пустых, по порядку
export const regularSeasons = (details) =>
  (details?.seasons || [])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number);

// Вышла ли серия: без даты считаем вышедшей, если сезон не новее последней вышедшей серии
export const isAired = (ep, lastAired) => {
  if (ep.air_date) return ep.air_date <= today();
  if (!lastAired) return false;
  return (
    ep.season_number < lastAired.season_number ||
    (ep.season_number === lastAired.season_number && ep.episode_number <= lastAired.episode_number)
  );
};

// Сколько серий сезона уже вышло (по деталям сериала, без загрузки сезона)
export function airedInSeason(season, lastAired) {
  if (!lastAired) return 0;
  if (season.season_number < lastAired.season_number) return season.episode_count || 0;
  if (season.season_number === lastAired.season_number) return lastAired.episode_number;
  return 0;
}

export const totalAired = (seasons, lastAired) =>
  seasons.reduce((sum, s) => sum + airedInSeason(s, lastAired), 0);

// Серия после last ({ s, e }; null — ничего не смотрели).
// { season, episode } — вышла и её можно смотреть, { done: true } — дальше пока ничего нет.
export function nextAfter(seasons, last, lastAired) {
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

// Последняя отмеченная серия из набора ключей «сезон-серия»
export function lastOf(watchedKeys) {
  let last = null;
  for (const key of watchedKeys) {
    const [s, e] = key.split("-").map(Number);
    if (!last || s > last.s || (s === last.s && e > last.e)) last = { s, e };
  }
  return last;
}

// Сериал ещё выходит: ждём новые серии или сезоны
export const isOngoing = (details) =>
  Boolean(details?.next_episode_to_air) ||
  ["Returning Series", "In Production", "Planned", "Pilot"].includes(details?.status);

export const episodeLabel = (season, episode) => `S${season} · E${episode}`;
