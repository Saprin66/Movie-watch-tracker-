import { useEffect, useState } from "react";
import { TMDB, TMDB_API_KEY, POSTER, BACKDROP } from "../config";
import { MovieCard, Chip, Empty, Row } from "./ui";
import { BTN_ORANGE, BTN_SOFT, EYEBROW, PAGE_TITLE, SECTION_TITLE } from "./styles";

const IMAGE = (path) => (path ? `${POSTER}${path}` : null);
const YEAR = (movie) => (movie.release_date || movie.first_air_date || "").slice(0, 4);

function MovieRow({ title, subtitle, items, onOpenMovie, loading, emptyText }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className={SECTION_TITLE}>{title}</h2>
        {subtitle && <p className="mt-1.5 text-[13px] text-[#8b91b5]">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="flex gap-3 sm:gap-4 overflow-hidden">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-[112px] sm:w-[136px] shrink-0 aspect-[2/3] rounded-[14px] bg-white/5 animate-pulse" />)}</div>
      ) : items.length ? (
        <Row>
          {items.map((movie, index) => (
            <div key={`${movie.media_type || "movie"}-${movie.id}`} className="w-[112px] sm:w-[136px] shrink-0 snap-start">
              <MovieCard
                poster={IMAGE(movie.poster_path)}
                title={movie.title || movie.name}
                chips={<><Chip tone="orange">★ {Number(movie.vote_average || 0).toFixed(1)}</Chip>{index < 3 && <Chip>#{index + 1}</Chip>}</>}
                footerLeft={<>{YEAR(movie) || "Год неизвестен"}</>}
                onClick={() => onOpenMovie({ ...movie, media_type: movie.media_type || "movie" })}
              />
            </div>
          ))}
        </Row>
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
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${EYEBROW} mb-2.5`}>Movie night</p>
          <h1 className={PAGE_TITLE}>Главная</h1>
          <p className="mt-2.5 text-sm text-[#8b91b5]">Трейлеры, рейтинги и идеи для следующего просмотра.</p>
        </div>
        <button onClick={onBrowse} className={`h-11 rounded-xl px-5 text-sm ${BTN_SOFT}`}>Подобрать по фильтрам →</button>
      </header>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}. Проверьте подключение и ключ TMDB.</div>}

      {featured && (
        <section className="relative overflow-hidden rounded-[24px] border border-white/[0.08] mg-glow-hero">
          <div className="grid lg:grid-cols-[1.35fr_1fr]">
            <div className="relative min-h-[220px] sm:min-h-[340px] bg-black/60">
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
              ) : <div className="absolute inset-0 bg-gradient-to-br from-[#252b58] to-[#0d1021]" />}
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-9">
              <div className="mb-4 flex flex-wrap gap-2">
                <Chip tone="orange">{trailerKey ? "Трейлер" : "В центре внимания"}</Chip>
                {YEAR(featured) && <Chip>{YEAR(featured)}</Chip>}
                <Chip>★ {Number(featured.vote_average || 0).toFixed(1)} / 10</Chip>
              </div>
              <h2 className="font-display text-2xl sm:text-[34px] font-bold leading-[1.08] text-white">{featured.title || featured.name}</h2>
              <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-[#c4c8e4]">{featured.overview || "Посмотрите трейлер и решите, подходит ли этот фильм для следующего вечера."}</p>
              <button onClick={() => onOpenMovie(featured)} className={`mt-6 w-fit h-11 rounded-xl px-5 text-sm ${BTN_ORANGE}`}>Подробнее о фильме</button>
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
