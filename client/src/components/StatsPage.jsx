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
        {unit && <span className="ml-1 text-sm font-bold text-[#c4c8e4]">{unit}</span>}
      </div>
      <div className="mt-1.5 text-xs font-bold text-[#aeb3d6]">{label}</div>
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
          <div className="text-xs text-[#aeb3d6]">Дней с просмотрами: {activeDays}</div>
        </div>
        <button type="button" onClick={() => shift(1)} disabled={isFuture} aria-label="Следующий месяц" className="mg-glass-btn w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none">
          <Icon n="chevron-right" className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[11px] font-extrabold text-[#7b81a6]">{w}</div>
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
                  : "text-[#8b91b5] bg-white/[0.04]"
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

// Просмотры по месяцам за последний год: столбики
function ActivityChart({ watched }) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { y: d.getFullYear(), m: d.getMonth(), count: 0 };
  });
  for (const movie of watched) {
    const d = watchedDate(movie);
    if (!d) continue;
    const slot = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (slot) slot.count += 1;
  }
  const max = Math.max(1, ...months.map((x) => x.count));
  const total = months.reduce((sum, x) => sum + x.count, 0);
  const best = months.reduce((a, b) => (b.count > a.count ? b : a), months[0]);

  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4]">Активность за год</h2>
          <div className="mt-1 font-display text-[22px] font-bold text-white">{total} просмотров</div>
        </div>
        {best.count > 0 && (
          <div className="text-right text-xs text-[#aeb3d6]">
            Самый активный месяц
            <div className="font-bold text-white">{MONTHS[best.m]} {best.y}</div>
          </div>
        )}
      </div>
      <div className="flex h-36 items-end gap-1.5" role="img" aria-label={`Просмотры по месяцам: ${months.map((x) => `${MONTHS[x.m]} ${x.count}`).join(", ")}`}>
        {months.map((x) => (
          <div key={`${x.y}-${x.m}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[10px] font-bold text-[#aeb3d6]">{x.count || ""}</span>
            <div
              className="mg-bar w-full rounded-t-[6px] bg-gradient-to-t from-[#a78bfa] to-[#7ee8fa]"
              style={{ height: `${Math.max(x.count ? 6 : 2, (x.count / max) * 100)}%`, opacity: x.count ? 1 : 0.25, transformOrigin: "bottom" }}
            />
            <span className="text-[10px] font-bold text-[#7b81a6]">{MONTHS[x.m].slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Выгрузка журнала в файл (CSV для таблиц, JSON для программ)
const EXPORT_FIELDS = ["title", "mediaType", "status", "rating", "comment", "releaseYear", "genres", "watchedAt", "createdAt", "tmdbId"];

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJournal(movies, format) {
  const rows = movies.map((m) =>
    Object.fromEntries(EXPORT_FIELDS.map((f) => [f, f === "genres" ? (m.genres || []).join("; ") : m[f] ?? ""])),
  );
  const date = new Date().toISOString().slice(0, 10);
  if (format === "json") {
    download(`moviegrade-${date}.json`, JSON.stringify(rows, null, 2), "application/json");
    return;
  }
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [EXPORT_FIELDS.join(","), ...rows.map((r) => EXPORT_FIELDS.map((f) => escape(r[f])).join(","))].join("\r\n");
  // BOM, чтобы Excel правильно открыл русские буквы
  download(`moviegrade-${date}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
}

function ExportSection({ movies }) {
  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4]">Экспорт журнала</h2>
      <p className="mt-1.5 text-sm text-[#aeb3d6]">Все {movies.length} записей с оценками, отзывами, жанрами и датами.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          { id: "csv", label: "Скачать CSV", icon: "sheet" },
          { id: "json", label: "Скачать JSON", icon: "braces" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            disabled={!movies.length}
            onClick={() => exportJournal(movies, f.id)}
            className="mg-glass-btn mg-glass-btn--wide h-12 rounded-full inline-flex items-center justify-center gap-2 text-sm font-extrabold text-white disabled:opacity-40"
          >
            <Icon n={f.icon} className="w-4 h-4" />
            {f.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// Расширенная статистика недоступна на Free: показываем, что даёт подписка
function LockedStats({ onOpenPremium }) {
  return (
    <section className="mg-page-rise mg-glass-panel relative overflow-hidden rounded-[28px] px-6 py-10 text-center">
      <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#ffb347]/20 blur-[80px]" aria-hidden="true" />
      <div className="relative">
        <span className="mx-auto w-16 h-16 rounded-[22px] flex items-center justify-center bg-gradient-to-br from-[#ffe08a] to-[#ff9a3d]">
          <Icon n="chart-column" className="w-8 h-8 [filter:brightness(0.12)]" />
        </span>
        <h2 className="mt-5 font-display text-[22px] font-bold text-white">Расширенная статистика</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#aeb3d6]">
          Топ жанров и часы просмотра — в Gold. Графики активности и экспорт журнала в CSV и JSON — в Brilliant.
        </p>
        <button
          type="button"
          onClick={onOpenPremium}
          className="mt-6 h-12 px-6 rounded-full text-sm font-extrabold text-[#2a1600] bg-gradient-to-r from-[#ffe08a] via-[#ffb347] to-[#ff8a50]"
        >
          Посмотреть подписки
        </button>
      </div>
    </section>
  );
}

export default function StatsPage({ movies, onBack, onOpenMovie, plan = "free", onOpenPremium }) {
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

      {plan === "free" ? (
        <LockedStats onOpenPremium={onOpenPremium} />
      ) : (
      <>

      <div className="mg-page-rise grid grid-cols-2 gap-2">
        <Tile value={loading ? "…" : hours.value} unit={loading ? "" : hours.unit} label="Время просмотра" />
        <Tile value={avgRating} label="Средняя оценка" />
        <Tile value={total.films} label="Фильмов" />
        <Tile value={total.series} label="Сериалов" />
      </div>

      <section className="mg-page-rise mg-glass-panel rounded-[24px] p-5" style={{ animationDelay: "60ms" }}>
        <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9aa0c4]">Любимый жанр</h2>
        {genres.length ? (
          <>
            <div className="font-display text-[26px] font-bold text-white">{genres[0].name}</div>
            <ul className="mt-4 space-y-2.5">
              {genres.map((g) => (
                <li key={g.name}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-[#e2e4f3]">{g.name}</span>
                    <span className="text-[#9aa0c4]">{g.count}</span>
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
          <p className="mt-2 text-sm text-[#aeb3d6]">Отметь несколько фильмов просмотренными — и здесь появится любимый жанр.</p>
        )}
      </section>

      {plan === "brilliant" ? (
        <>
          <div className="mg-page-rise" style={{ animationDelay: "120ms" }}>
            <ActivityChart watched={watched} />
          </div>
          <div className="mg-page-rise" style={{ animationDelay: "160ms" }}>
            <WatchCalendar watched={watched} onOpenMovie={onOpenMovie} />
          </div>
          <div className="mg-page-rise" style={{ animationDelay: "200ms" }}>
            <ExportSection movies={movies} />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onOpenPremium}
          className="mg-page-rise mg-glass-panel w-full rounded-[24px] p-5 flex items-center gap-4 text-left"
          style={{ animationDelay: "120ms" }}
        >
          <span className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#7ee8fa] via-[#a78bfa] to-[#f472b6]">
            <Icon n="gem" className="w-5 h-5 [filter:brightness(0.12)]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-white">Графики активности и экспорт</span>
            <span className="block mt-0.5 text-xs text-[#aeb3d6]">Календарь просмотров, активность за год и выгрузка в CSV/JSON — в Brilliant</span>
          </span>
          <Icon n="chevron-right" className="w-5 h-5 opacity-60" />
        </button>
      )}
      </>
      )}
    </div>
  );
}
