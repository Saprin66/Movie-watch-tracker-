import { useEffect, useState } from "react";
import { TMDB, TMDB_API_KEY, POSTER, BACKDROP } from "../config";
import { MovieCard, Chip, Empty } from "./ui";

const IMAGE = (path) => (path ? `${POSTER}${path}` : null);
const YEAR = (movie) => (movie.release_date || movie.first_air_date || "").slice(0, 4);

function MovieRow({ title, subtitle, items, onOpenMovie, loading, emptyText }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[#8a90b8]">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="flex gap-3 overflow-hidden">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-32 sm:w-40 shrink-0 aspect-[2/3] rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : items.length ? (
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {items.map((movie, index) => (
            <div key={`${movie.media_type || "movie"}-${movie.id}`} className="w-32 sm:w-40 shrink-0 snap-start">
              <MovieCard
                poster={IMAGE(movie.poster_path)}
                title={movie.title || movie.name}
                chips={<><Chip tone="orange">★ {Number(movie.vote_average || 0).toFixed(1)}</Chip>{index < 3 && <Chip>#{index + 1}</Chip>}</>}
                footerLeft={<>{YEAR(movie) || "Год неизвестен"}</>}
                onClick={() => onOpenMovie({ ...movie, media_type: movie.media_type || "movie" })}
              />
            </div>
          ))}
        </div>
      ) : <Empty text={emptyText || "Пока не удалось загрузить подборку."} />}
    </section>
  );
}

export default function HomeFeed({ onOpenMovie, onBrowse }) {
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [trailerKey, setTrailerKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const getList = async (path) => {
      const response = await fetch(`${TMDB}${path}?api_key=${TMDB_API_KEY}&language=ru-RU&page=1`);
      if (!response.ok) throw new Error("TMDB не смог загрузить подборки");
      const data = await response.json();
      return (data.results || []).map((movie) => ({ ...movie, media_type: path.startsWith("/tv/") ? "tv" : "movie" }));
    };

    (async () => {
      try {
        const [popularItems, topItems, playingItems] = await Promise.all([
          getList("/movie/popular"),
          getList("/movie/top_rated"),
          getList("/movie/now_playing"),
        ]);
        if (cancelled) return;
        setPopular(popularItems.slice(0, 12));
        setTopRated(topItems.slice(0, 12));
        setNowPlaying(playingItems.slice(0, 12));
        const feature = [...playingItems, ...popularItems].find((movie) => movie.backdrop_path) || popularItems[0];
        setFeatured(feature || null);
        if (feature) {
          const videoResponse = await fetch(`${TMDB}/movie/${feature.id}/videos?api_key=${TMDB_API_KEY}&language=ru-RU`);
          let videos = videoResponse.ok ? (await videoResponse.json()).results || [] : [];
          let trailer = videos.find((video) => video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type) && video.official);
          if (!trailer) trailer = videos.find((video) => video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type));
          if (!trailer) {
            const englishResponse = await fetch(`${TMDB}/movie/${feature.id}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
            if (englishResponse.ok) {
              videos = (await englishResponse.json()).results || [];
              trailer = videos.find((video) => video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type) && video.official)
                || videos.find((video) => video.site === "YouTube" && ["Trailer", "Teaser", "Clip"].includes(video.type));
            }
          }
          if (!cancelled && trailer) setTrailerKey(trailer.key);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Не удалось загрузить главную страницу");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const eveningPicks = [...popular]
    .filter((movie) => Number(movie.vote_average) >= 6.5 && Number(movie.vote_count) >= 100)
    .sort((a, b) => (Number(b.vote_average) * Math.log10(Number(b.vote_count) + 1)) - (Number(a.vote_average) * Math.log10(Number(a.vote_count) + 1)))
    .slice(0, 10);

  return (
    <div className="space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#f47c4f] mb-2">Movie night</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Главная</h1>
          <p className="mt-2 text-sm sm:text-base text-[#a0a5ca]">Трейлеры, рейтинги и идеи для следующего просмотра.</p>
        </div>
        <button onClick={onBrowse} className="rounded-xl bg-[#f47c4f] px-4 py-2.5 text-sm font-semibold text-[#1a1020] hover:bg-[#ff956b] transition">Подобрать по фильтрам →</button>
      </header>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}. Проверьте подключение и ключ TMDB.</div>}

      {featured && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#171a33]">
          <div className="grid lg:grid-cols-[1.35fr_1fr]">
            <div className="relative min-h-[220px] sm:min-h-[320px] bg-black">
              {trailerKey ? (
                <iframe
                  className="absolute inset-0 h-full w-full min-h-[220px] sm:min-h-[320px]"
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}?rel=0&modestbranding=1`}
                  title={`Трейлер: ${featured.title || featured.name}`}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : featured.backdrop_path ? (
                <img className="absolute inset-0 h-full w-full object-cover" src={`${BACKDROP}${featured.backdrop_path}`} alt="" />
              ) : <div className="absolute inset-0 bg-gradient-to-br from-[#252b58] to-[#131631]" />}
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
              <span className="mb-3 w-fit rounded-full bg-[#f47c4f]/15 px-3 py-1 text-xs font-medium text-[#f47c4f]">{trailerKey ? "Трейлер / фрагмент" : "В центре внимания"}</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{featured.title || featured.name}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#a0a5ca]">
                {YEAR(featured) && <span>{YEAR(featured)}</span>}
                <span>★ {Number(featured.vote_average || 0).toFixed(1)} / 10</span>
              </div>
              <p className="mt-4 line-clamp-5 text-sm leading-6 text-[#c1c5e1]">{featured.overview || "Посмотрите трейлер и решите, подходит ли этот фильм для следующего вечера."}</p>
              <button onClick={() => onOpenMovie(featured)} className="mt-6 w-fit rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15">Подробнее о фильме</button>
              {!trailerKey && <p className="mt-3 text-xs text-[#777da6]">Для этого фильма TMDB пока не нашёл подходящий трейлер на YouTube.</p>}
            </div>
          </div>
        </section>
      )}

      <MovieRow title="Топ по рейтингу TMDB" subtitle="Самые высоко оценённые фильмы в каталоге TMDB — это не официальный IMDb Top 250." items={topRated} onOpenMovie={onOpenMovie} loading={loading} />
      <MovieRow title="Что посмотреть вечером" subtitle="Популярные фильмы с хорошим рейтингом и достаточным числом оценок." items={eveningPicks} onOpenMovie={onOpenMovie} loading={loading} />
      <MovieRow title="Сейчас в кино" subtitle="Фильмы из текущей подборки TMDB." items={nowPlaying} onOpenMovie={onOpenMovie} loading={loading} />
      <MovieRow title="Популярное" subtitle="Что сейчас часто смотрят и ищут." items={popular} onOpenMovie={onOpenMovie} loading={loading} />
    </div>
  );
}
