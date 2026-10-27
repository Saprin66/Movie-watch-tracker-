import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { Chip, Empty, Grid, MovieCard, SubTabs } from "./ui";
import { ORANGE_FILTER } from "./styles";
import { API_URL } from "../config";

const STATUS_TABS = [
  { id: "WATCHED", label: "Просмотрено" },
  { id: "WATCHLIST", label: "Буду смотреть" },
];

const SORTS = [
  { id: "date", label: "Сначала новые" },
  { id: "rating", label: "По оценке" },
  { id: "title", label: "По названию" },
];

const dateOf = (m) => new Date(m.status === "WATCHED" && m.watchedAt ? m.watchedAt : m.createdAt).getTime() || 0;

// Весь журнал друга: сервер отдаёт его только самому пользователю и его друзьям
export default function UserMovies({ userId, token, username, onOpenMovie }) {
  const [state, setState] = useState({ loading: true, movies: [], error: "" });
  const [status, setStatus] = useState("WATCHED");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("date");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/users/${userId}/movies`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
        return Array.isArray(data) ? data : [];
      })
      .then((movies) => !cancelled && setState({ loading: false, movies, error: "" }))
      .catch((error) => !cancelled && setState({ loading: false, movies: [], error: error.message }));
    return () => {
      cancelled = true;
    };
  }, [userId, token]);

  const { loading, movies, error } = state;
  const counts = useMemo(
    () => ({
      WATCHED: movies.filter((m) => m.status === "WATCHED").length,
      WATCHLIST: movies.filter((m) => m.status === "WATCHLIST").length,
    }),
    [movies],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = movies.filter(
      (m) => m.status === status && (!q || m.title.toLowerCase().includes(q)),
    );
    const sorters = {
      date: (a, b) => dateOf(b) - dateOf(a),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0) || dateOf(b) - dateOf(a),
      title: (a, b) => a.title.localeCompare(b.title, "ru"),
    };
    return [...list].sort(sorters[sort]);
  }, [movies, status, query, sort]);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ff8f5f] mb-2">Журнал</div>
        <h1 className="font-display text-[26px] sm:text-[32px] font-bold leading-tight text-white">
          Фильмы {username}
        </h1>
      </div>

      <SubTabs
        items={STATUS_TABS.map((t) => ({ ...t, count: counts[t.id] }))}
        active={status}
        onChange={setStatus}
        className="flex justify-center"
        itemClass="sm:w-[190px]"
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Icon n="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50 w-[18px] h-[18px]" />
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию"
            aria-label="Поиск по фильмам друга"
            className="w-full h-11 bg-[#12152a] border border-white/[0.08] rounded-xl pl-11 pr-3 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Сортировка"
          className="h-11 bg-[#12152a] border border-white/[0.08] rounded-xl px-3 text-sm font-semibold text-white focus:outline-none focus:border-[#ff7a45]"
        >
          {SORTS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-16 text-center text-[#8b91b5] animate-pulse">Загружаем фильмы…</p>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/15 px-4 py-3 text-sm text-red-200">
          Не удалось загрузить список: {error}
        </p>
      ) : shown.length === 0 ? (
        <Empty text={query ? "Ничего не нашлось" : "Здесь пока пусто"} />
      ) : (
        <Grid>
          {shown.map((m) => (
            <MovieCard
              key={m.id}
              poster={m.posterUrl}
              title={m.title}
              note={m.comment}
              tmdb={m.tmdbId ? { id: m.tmdbId, type: m.mediaType } : null}
              onClick={() =>
                m.tmdbId &&
                onOpenMovie({
                  id: m.tmdbId,
                  media_type: m.mediaType === "tv" ? "tv" : "movie",
                  title: m.title,
                  posterUrl: m.posterUrl,
                })
              }
              chips={
                <>
                  {m.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
                  {m.rating && (
                    <Chip tone="orange">
                      <Icon n="star" className={`w-3 h-3 inline -mt-0.5 mr-0.5 ${ORANGE_FILTER}`} />
                      {m.rating}
                    </Chip>
                  )}
                  {m.comment && (
                    <Chip>
                      <Icon n="message-square" className="w-3 h-3 inline -mt-0.5" />
                    </Chip>
                  )}
                </>
              }
              footerLeft={m.releaseYear || (m.mediaType === "tv" ? "Сериал" : "Фильм")}
            />
          ))}
        </Grid>
      )}
    </div>
  );
}
