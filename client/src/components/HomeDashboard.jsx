import { useEffect, useMemo, useRef, useState } from "react";
import { TMDB, TMDB_API_KEY, POSTER } from "../config";
import Icon from "./Icon";
import { Poster, Row, MovieCard, Chip } from "./ui";
import { PANEL, BTN_ORANGE, ORANGE_FILTER, SECTION_TITLE } from "./styles";
import { topGenres, watchedDate, isThisMonth } from "../utils/watchStats";
import { formatTimeAgo } from "../utils/time";
import { pluralize } from "../utils/plural";

const YEAR = (m) => (m.release_date || m.first_air_date || "").slice(0, 4);
const keyOf = (type, id) => `${type === "tv" ? "tv" : "movie"}-${id}`;

const WORDS = ["", "Мимо", "Слабо", "Так себе", "Ниже среднего", "Нормально", "Неплохо", "Хорошо", "Сильно", "Восторг", "Шедевр"];

// ---------- Быстрый лог: найти, оценить, сохранить ----------

export function QuickLog({ movies, onSave, onOpenMovie }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) return undefined;
    const id = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${TMDB}/search/multi?api_key=${TMDB_API_KEY}&language=ru-RU&include_adult=false&query=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { results: [] };
        if (id !== seq.current) return;
        setResults((data.results || []).filter((m) => m.media_type === "movie" || m.media_type === "tv").slice(0, 6));
        setOpen(true);
      } catch {
        if (id === seq.current) setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const existing = picked
    ? movies.find((m) => keyOf(m.mediaType, m.tmdbId) === keyOf(picked.media_type, picked.id))
    : null;

  const pick = (movie) => {
    const entry = movies.find((m) => keyOf(m.mediaType, m.tmdbId) === keyOf(movie.media_type, movie.id));
    setPicked(movie);
    setRating(entry?.rating || 0);
    setNote("");
    setQuery("");
    setResults([]);
    setOpen(false);
    setMessage(null);
  };

  const save = async () => {
    if (!picked || !rating || saving) return;
    setSaving(true);
    const result = await onSave(picked, { rating, comment: note.trim() || undefined });
    setSaving(false);
    if (result?.ok) {
      setMessage({ ok: true, text: `«${picked.title || picked.name}» — ${rating}/10 в журнале` });
      setPicked(null);
      setRating(0);
      setNote("");
    } else {
      setMessage({ ok: false, text: result?.error || "Не удалось сохранить. Попробуйте ещё раз." });
    }
  };

  const shown = hover || rating;

  return (
    <section className={`${PANEL} relative p-5 sm:p-6`} aria-labelledby="quicklog-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="quicklog-title" className="flex items-center gap-2.5 text-[15px] font-bold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#ff7a45]/[0.16]">
            <Icon n="zap" className={`h-4 w-4 ${ORANGE_FILTER}`} />
          </span>
          Быстрый лог
        </h2>
        <span className="hidden text-xs text-[#8f8d9b] sm:block">Оценка и мысль за пару секунд</span>
      </div>

      <div className="relative">
        <Icon n="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        <input
          id="quicklog-input"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) { setResults([]); setOpen(false); }
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={picked ? "Другой фильм или сериал…" : "Что посмотрели? Начните вводить название"}
          aria-label="Найти фильм для оценки"
          className="w-full h-12 rounded-2xl lg:rounded-xl border border-white/[0.09] bg-mg-sunken pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-[#6f6d7b] focus:outline-none focus:border-[#ff7a45] transition"
        />
        {open && results.length > 0 && (
          <ul className="mg-pop-glass absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl lg:rounded-xl border border-white/10 bg-mg-pop p-1.5 shadow-2xl shadow-black/50" role="listbox">
            {results.map((m) => (
              <li key={`${m.media_type}-${m.id}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m)}
                  className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.07]"
                >
                  <span className="h-12 w-8 shrink-0 overflow-hidden rounded-md">
                    <Poster src={m.poster_path ? `${POSTER}${m.poster_path}` : null} title={m.title || m.name} small />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white">{m.title || m.name}</span>
                    <span className="block text-xs text-[#8f8d9b]">{[YEAR(m), m.media_type === "tv" ? "Сериал" : "Фильм"].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {picked ? (
        <div className="mt-5 grid gap-5 2xl:grid-cols-[1fr_1fr]">
          <div>
            <button type="button" onClick={() => onOpenMovie(picked)} className="mb-5 flex w-full items-center gap-4 text-left group">
              <span className="h-[84px] w-14 shrink-0 overflow-hidden rounded-lg shadow-lg">
                <Poster src={picked.poster_path ? `${POSTER}${picked.poster_path}` : null} title={picked.title || picked.name} small />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[26px] leading-tight text-white group-hover:text-[#ffb08c] transition-colors">{picked.title || picked.name}</span>
                <span className="block text-[13px] text-[#8f8d9b]">
                  {[YEAR(picked), picked.media_type === "tv" ? "Сериал" : "Фильм", existing && (existing.status === "WATCHED" ? "уже в журнале" : "в «Буду смотреть»")].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>

            <div className="mb-2 flex items-end justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c7a88]">Оценка</span>
              <span className="flex items-baseline gap-2">
                <span className="font-display text-[42px] leading-none text-[#ffb08c] tabular-nums">{shown || "—"}</span>
                <span className="text-[13px] text-[#8f8d9b]">{WORDS[shown] || "выберите"}</span>
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5" role="radiogroup" aria-label="Оценка от 1 до 10" onMouseLeave={() => setHover(0)}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={rating === v}
                  aria-label={`${v} из 10`}
                  data-on={v <= shown}
                  onMouseEnter={() => setHover(v)}
                  onClick={() => setRating(v)}
                  className="mg-seg h-10 rounded-lg bg-white/10 lg:h-9 lg:bg-mg-raised"
                />
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-[#6f6d7b] tabular-nums"><span>1</span><span>5</span><span>10</span></div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="quicklog-note" className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c7a88]">Заметка</label>
            <textarea
              id="quicklog-note"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save(); }}
              placeholder="Одна мысль, пока свежо…"
              className="min-h-[96px] flex-1 resize-none rounded-2xl lg:rounded-xl border border-white/[0.09] bg-mg-sunken px-4 py-3 font-display text-[19px] italic leading-snug text-white placeholder:text-[#6f6d7b] focus:outline-none focus:border-[#ff7a45] transition"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { setPicked(null); setRating(0); setNote(""); }} className="h-12 lg:h-11 rounded-2xl lg:rounded-xl px-4 text-sm font-bold text-[#b4b2bf] hover:text-white transition-colors">
                Отмена
              </button>
              <button
                type="button"
                disabled={!rating || saving}
                onClick={save}
                className={`flex-1 whitespace-nowrap h-12 lg:h-11 inline-flex items-center justify-center gap-2 rounded-2xl lg:rounded-xl text-sm disabled:opacity-40 ${BTN_ORANGE}`}
              >
                <Icon n="check" className="h-4 w-4 [filter:brightness(0.1)]" />
                {saving ? "Сохраняем…" : "Сохранить в журнал"}
                <kbd className="hidden lg:inline rounded border border-black/20 px-1.5 text-[10px] font-semibold opacity-70">⌘↵</kbd>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-[#8f8d9b]">
          Найдите фильм, поставьте оценку от 1 до 10 и, если хочется, оставьте пару слов. Фильм сразу попадёт в «Просмотрено».
        </p>
      )}

      {message && (
        <p role="status" className={`mt-4 rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-200"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}

// ---------- Мой год в кино: цифры, оценки, жанры ----------

export function YearStats({ movies, onOpenStats }) {
  const stats = useMemo(() => {
    const watched = movies.filter((m) => m.status === "WATCHED");
    const now = new Date();
    const year = watched.filter((m) => watchedDate(m)?.getFullYear() === now.getFullYear()).length;
    const month = watched.filter((m) => isThisMonth(watchedDate(m), now)).length;
    const rated = watched.filter((m) => m.rating);
    const avg = rated.length ? rated.reduce((s, m) => s + m.rating, 0) / rated.length : 0;
    const hist = Array.from({ length: 10 }, (_, i) => rated.filter((m) => m.rating === i + 1).length);
    return { total: watched.length, year, month, avg, hist, genres: topGenres(watched).slice(0, 4), rated: rated.length };
  }, [movies]);

  const maxHist = Math.max(1, ...stats.hist);
  const maxGenre = stats.genres[0]?.count || 1;

  return (
    <section className={`${PANEL} p-5 sm:p-6`} aria-labelledby="year-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="year-title" className="text-[15px] font-bold text-white">{new Date().getFullYear()} в кино</h2>
        <button type="button" onClick={onOpenStats} className="text-[12px] font-bold text-[#ff935f] hover:text-[#ffb08a] transition-colors">Вся статистика →</button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-[64px] leading-none text-white tabular-nums">{stats.year}</span>
        <span className="text-sm text-[#8f8d9b]">{pluralize(stats.year, "просмотр", "просмотра", "просмотров")} в этом году</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c7a88]">Средняя</div>
          <div className="mt-1 font-display text-[28px] leading-none text-[#ffb08c] tabular-nums">{stats.avg ? stats.avg.toFixed(1) : "—"}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c7a88]">За месяц</div>
          <div className="mt-1 font-display text-[28px] leading-none text-white tabular-nums">{stats.month}</div>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c7a88]">Всего</div>
          <div className="mt-1 font-display text-[28px] leading-none text-white tabular-nums">{stats.total}</div>
        </div>
      </div>

      {stats.rated > 0 && (
        <>
          <div className="mt-6 mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7c7a88]">Как вы оцениваете</div>
          <div className="flex h-20 items-end gap-1.5" aria-label="Распределение оценок">
            {stats.hist.map((n, i) => (
              <div key={i} className="group relative flex h-full flex-1 items-end" title={`${i + 1}: ${n}`}>
                <div
                  className={`w-full rounded-t-[5px] transition-[filter] group-hover:brightness-125 ${i >= 7 ? "bg-gradient-to-t from-[#ff7a45] to-[#e8577a]" : "bg-white/[0.14] lg:bg-white/[0.1]"}`}
                  style={{ height: `${Math.max(4, (n / maxHist) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-10 gap-1.5 text-center text-[10px] text-[#6f6d7b] tabular-nums">
            {stats.hist.map((_, i) => <span key={i}>{i + 1}</span>)}
          </div>
        </>
      )}

      {stats.genres.length > 0 && (
        <div className="mt-6 space-y-3">
          {stats.genres.map((g, i) => (
            <div key={g.name}>
              <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-[#cfcdd8]">{g.name}</span><span className="text-[#7c7a88] tabular-nums">{g.count}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="mg-bar h-full rounded-full bg-gradient-to-r from-[#ff7a45] to-[#e8577a]" style={{ width: `${(g.count / maxGenre) * 100}%`, opacity: 1 - i * 0.15 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Под настроение: подборки TMDB по жанрам без уже просмотренного ----------

const MOODS = [
  { id: "cozy", label: "Уютный вечер", icon: "sofa", params: "with_genres=35|10751&vote_average.gte=6.8&vote_count.gte=800" },
  { id: "nerves", label: "Пощекотать нервы", icon: "ghost", params: "with_genres=53|27&vote_average.gte=6.8&vote_count.gte=800" },
  { id: "mind", label: "Сломать мозг", icon: "brain", params: "with_genres=878,9648&vote_average.gte=7&vote_count.gte=800" },
  { id: "tears", label: "Поплакать", icon: "droplet", params: "with_genres=18,10749&vote_average.gte=7.2&vote_count.gte=800" },
  { id: "rush", label: "Адреналин", icon: "flame", params: "with_genres=28|12&vote_average.gte=6.8&vote_count.gte=1500" },
  { id: "classic", label: "Классика", icon: "film", params: "primary_release_date.lte=1999-12-31&vote_average.gte=7.8&vote_count.gte=2000" },
];

export function MoodPicks({ movies, onOpenMovie }) {
  const [mood, setMood] = useState(MOODS[0].id);
  // Подборка помнит, для какого настроения загружена: пока не совпадает — показываем заглушки
  const [loaded, setLoaded] = useState({ mood: null, items: [] });
  const loading = loaded.mood !== mood;

  const seen = useMemo(() => new Set(movies.filter((m) => m.status === "WATCHED").map((m) => keyOf(m.mediaType, m.tmdbId))), [movies]);

  useEffect(() => {
    let cancelled = false;
    const params = MOODS.find((m) => m.id === mood).params;
    // Случайная страница из первых трёх, чтобы подборка не была одной и той же
    const page = 1 + Math.floor(Math.random() * 3);
    fetch(`${TMDB}/discover/movie?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=popularity.desc&page=${page}&${params}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => { if (!cancelled) setLoaded({ mood, items: data.results || [] }); })
      .catch(() => { if (!cancelled) setLoaded({ mood, items: [] }); });
    return () => { cancelled = true; };
  }, [mood]);

  const fresh = loaded.items.filter((m) => !seen.has(keyOf("movie", m.id))).slice(0, 12);

  return (
    <section className="space-y-4" aria-labelledby="mood-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="mood-title" className={`flex items-center gap-2.5 ${SECTION_TITLE}`}>
            <Icon n="sparkles" className={`h-5 w-5 ${ORANGE_FILTER}`} />
            Под настроение
          </h2>
          <p className="mt-1.5 text-[13px] text-[#8f8d9b]">Выберите, чего хочется сегодня. Уже просмотренное мы убрали.</p>
        </div>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Настроение">
        {MOODS.map((m) => {
          const active = m.id === mood;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => setMood(m.id)}
              className={`mg-glass-chip shrink-0 !font-bold !text-[13px] transition-transform active:scale-95 ${active ? "mg-glass-chip--orange" : "!text-[#b4b2bf] hover:!text-white"}`}
            >
              <Icon n={m.icon} className={`h-3.5 w-3.5 ${active ? ORANGE_FILTER : "opacity-70"}`} />
              {m.label}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="flex gap-3 sm:gap-4 overflow-hidden">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-[112px] sm:w-[136px] shrink-0 aspect-[2/3] rounded-[14px] bg-white/5 animate-pulse" />)}</div>
      ) : (
        <Row>
          {fresh.map((movie) => (
            <div key={movie.id} className="w-[112px] sm:w-[136px] shrink-0 snap-start">
              <MovieCard
                poster={movie.poster_path ? `${POSTER}${movie.poster_path}` : null}
                title={movie.title}
                chips={<Chip tone="orange">★ {Number(movie.vote_average || 0).toFixed(1)}</Chip>}
                footerLeft={YEAR(movie) || "Год неизвестен"}
                onClick={() => onOpenMovie({ ...movie, media_type: "movie" })}
              />
            </div>
          ))}
        </Row>
      )}
    </section>
  );
}

// ---------- Недавние оценки из журнала ----------

export function RecentDiary({ movies, onOpenEntry, onOpenJournal }) {
  const recent = movies
    .filter((m) => m.status === "WATCHED" && (m.rating || m.comment))
    .sort((a, b) => (watchedDate(b)?.getTime() || 0) - (watchedDate(a)?.getTime() || 0))
    .slice(0, 5);
  if (!recent.length) return null;

  return (
    <section aria-labelledby="diary-title">
      <div className="mb-3 flex items-end justify-between">
        <h2 id="diary-title" className={SECTION_TITLE}>Недавно оценили</h2>
        <button type="button" onClick={onOpenJournal} className="text-[13px] font-bold text-[#ff935f] hover:text-[#ffb08a] transition-colors">Весь журнал →</button>
      </div>
      <div className="flex flex-col gap-2.5 lg:gap-0 lg:divide-y lg:divide-white/[0.06] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-white/[0.06] lg:bg-mg-panel">
        {recent.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onOpenEntry(m)}
            className={`${PANEL} lg:!rounded-none lg:!border-0 lg:!shadow-none group flex w-full items-start gap-4 p-3.5 text-left transition-colors lg:px-5 lg:py-4 lg:hover:bg-white/[0.03]`}
          >
            <span className="h-[84px] w-14 shrink-0 overflow-hidden rounded-xl lg:h-[72px] lg:w-12 lg:rounded-lg shadow-md transition-transform duration-300 group-hover:scale-[1.04]">
              <Poster src={m.posterUrl} title={m.title} small />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold text-white">{m.title}</span>
                  <span className="block text-xs text-[#7c7a88]">{[m.releaseYear, m.watchedAt && formatTimeAgo(m.watchedAt)].filter(Boolean).join(" · ")}</span>
                </span>
                {m.rating && (
                  <span className="shrink-0 text-right">
                    <span className="font-display text-[28px] leading-none text-[#ffb08c] tabular-nums">{m.rating}</span>
                    <span className="text-xs text-[#6f6d7b]">/10</span>
                  </span>
                )}
              </span>
              {m.comment && (
                <span className="mt-1.5 block line-clamp-2 font-display text-[17px] italic leading-snug text-[#cfcdd8]">«{m.comment}»</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
