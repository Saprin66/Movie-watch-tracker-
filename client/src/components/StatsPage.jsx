import { useState } from "react";
import Icon from "./Icon";
import { Poster } from "./ui";
import {
  MONTHS,
  formatHours,
  summarize,
  timeEntries,
  topGenres,
  useRuntimes,
  watchedDate,
} from "../utils/watchStats";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function Tile({ value, unit, label }) {
  return (
    <div className="mg-glass-chip flex-col !items-start !gap-0 !rounded-[18px] !px-4 !py-3.5 min-w-0">
      <div className="font-display text-[24px] sm:text-[28px] font-bold text-white leading-none">
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-[#cfcdd8]">{unit}</span>}
      </div>
      <div className="mt-1.5 text-xs font-bold text-[#b4b2bf]">{label}</div>
    </div>
  );
}

// Календарь месяца: подсвечены дни, когда что-то посмотрели
function WatchCalendar({ watched, onOpenMovie }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);

  const byDay = new Map();
  for (const movie of watched) {
    const d = watchedDate(movie);
    if (!d) continue;
    const key = dayKey(d);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(movie);
  }

  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // неделя с понедельника
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.y, cursor.m, i + 1)),
  ];
  const activeDays = cells.filter((d) => d && byDay.has(dayKey(d))).length;

  const shift = (delta) => {
    setSelectedDay(null);
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };
  const isFuture = cursor.y > today.getFullYear() ||
    (cursor.y === today.getFullYear() && cursor.m >= today.getMonth());

  const dayMovies = selectedDay ? byDay.get(selectedDay) || [] : [];

  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Предыдущий месяц" className="mg-glass-btn w-10 h-10 rounded-full flex items-center justify-center">
          <Icon n="chevron-left" className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="font-display text-[17px] font-semibold text-white">
            {MONTHS[cursor.m]} {cursor.y}
          </div>
          <div className="text-xs text-[#b4b2bf]">Дней с просмотрами: {activeDays}</div>
        </div>
        <button type="button" onClick={() => shift(1)} disabled={isFuture} aria-label="Следующий месяц" className="mg-glass-btn w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none">
          <Icon n="chevron-right" className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] font-extrabold text-[#7c7a88]">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const key = dayKey(d);
          const count = byDay.get(key)?.length || 0;
          const isToday = key === dayKey(today);
          const selected = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              disabled={!count}
              onClick={() => setSelectedDay(selected ? null : key)}
              aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}: просмотров ${count}`}
              aria-pressed={selected}
              className={`relative aspect-square rounded-xl text-[13px] font-bold transition ${
                count
                  ? `text-[#1b0d07] ${count > 1 ? "bg-[#ff7a45]" : "bg-[#ff7a45]/70"} hover:scale-105 shadow-[0_4px_14px_rgba(255,122,69,0.35)]`
                  : "text-[#8f8d9b] bg-white/[0.04]"
              } ${selected ? "ring-2 ring-white" : ""} ${isToday && !count ? "ring-1 ring-white/40" : ""}`}
            >
              {d.getDate()}
              {count > 1 && (
                <span className="absolute top-0.5 right-1 text-[9px] font-extrabold">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {dayMovies.length > 0 && (
        <ul className="mg-page-rise mt-4 space-y-1.5">
          {dayMovies.map((movie) => (
            <li key={movie.id}>
              <button
                type="button"
                onClick={() => onOpenMovie(movie)}
                className="w-full flex items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/[0.07] transition-colors"
              >
                <div className="w-9 aspect-[2/3] shrink-0 overflow-hidden rounded-lg">
                  <Poster src={movie.posterUrl} title={movie.title} small />
                </div>
                <span className="min-w-0 flex-1 text-sm font-bold text-white truncate">{movie.title}</span>
                {movie.rating && <span className="text-sm font-extrabold text-[#ff935f]">★ {movie.rating}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function StatsPage({ movies, onBack, onOpenMovie }) {
  const { runtimes, loading } = useRuntimes(movies);
  const watched = movies.filter((m) => m.status === "WATCHED");
  const total = summarize(timeEntries(movies), runtimes);
  const hours = formatHours(total.minutes);
  const rated = watched.filter((m) => m.rating);
  const avgRating = rated.length
    ? (rated.reduce((sum, m) => sum + m.rating, 0) / rated.length).toFixed(1)
    : "—";
  const genres = topGenres(watched).slice(0, 6);
  const maxGenre = genres[0]?.count || 1;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Назад в профиль" className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center">
          <Icon n="arrow-left" className="w-5 h-5" />
        </button>
        <h1 className="font-display text-[24px] sm:text-[28px] font-bold text-white">Статистика</h1>
      </div>

      <div className="mg-page-rise grid grid-cols-2 gap-2">
        <Tile value={loading ? "…" : hours.value} unit={loading ? "" : hours.unit} label="Время просмотра" />
        <Tile value={avgRating} label="Средняя оценка" />
        <Tile value={total.films} label="Фильмов" />
        <Tile value={total.series} label="Сериалов" />
      </div>

      <section className="mg-page-rise mg-glass-panel rounded-[24px] p-5" style={{ animationDelay: "60ms" }}>
        <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">Любимый жанр</h2>
        {genres.length ? (
          <>
            <div className="font-display text-[26px] font-bold text-white">{genres[0].name}</div>
            <ul className="mt-4 space-y-2.5">
              {genres.map((g) => (
                <li key={g.name}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-[#ecebf1]">{g.name}</span>
                    <span className="text-[#a19fad]">{g.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="mg-bar h-full rounded-full bg-gradient-to-r from-[#ff7a45] to-[#ffb08c]"
                      style={{ width: `${(g.count / maxGenre) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#b4b2bf]">Отметь несколько фильмов просмотренными — и здесь появится любимый жанр.</p>
        )}
      </section>

      <div className="mg-page-rise" style={{ animationDelay: "120ms" }}>
        <WatchCalendar watched={watched} onOpenMovie={onOpenMovie} />
      </div>
    </div>
  );
}
