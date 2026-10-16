import Icon from "./Icon";
import { Poster } from "./ui";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function RecentMovies({ movies, reviewsHidden = false }) {
  return (
    <div>
      <h3 className="font-display text-base sm:text-[17px] font-semibold text-white mb-4 flex items-center gap-2.5">
        <Icon n="clock" className="w-4 h-4 opacity-50" />
        Последние фильмы
      </h3>
      {reviewsHidden && (
        <p className="-mt-1 mb-3 text-xs text-[#6f759e]">
          Отзывы видны только друзьям
        </p>
      )}

      <ul className="space-y-2.5">
        {movies.map((movie, idx) => {
          const isWatched = movie.status === "WATCHED";
          const date = formatDate(
            isWatched && movie.watchedAt ? movie.watchedAt : movie.updatedAt,
          );

          return (
            <li
              key={movie.id || idx}
              className="flex gap-3.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3"
            >
              <div className="w-14 sm:w-16 aspect-[2/3] self-start shrink-0 overflow-hidden rounded-[10px] border border-white/[0.08]">
                <Poster src={movie.posterUrl} title={movie.title || "Фильм"} small />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-extrabold text-white truncate"
                      title={movie.title}
                    >
                      {movie.title || "Без названия"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold ${
                          isWatched
                            ? "bg-emerald-400/[0.14] text-[#58dcaa]"
                            : "bg-sky-400/[0.15] text-[#86b8ff]"
                        }`}
                      >
                        {isWatched ? "Просмотрено" : "Буду смотреть"}
                      </span>
                      {date && <span className="text-[#6f759e]">{date}</span>}
                    </div>
                  </div>

                  {movie.rating && (
                    <div
                      className="shrink-0 flex items-baseline gap-0.5 px-3 py-1.5 rounded-[10px] bg-[#ff7a45]/15 text-[#ff935f]"
                      aria-label={`Оценка ${movie.rating} из 10`}
                    >
                      <span className="font-display text-base font-bold leading-none">
                        {movie.rating}
                      </span>
                      <span className="text-[11px] opacity-70">/10</span>
                    </div>
                  )}
                </div>

                {movie.comment ? (
                  <p className="mt-2 text-sm text-[#c4c8e4] leading-relaxed whitespace-pre-line break-words line-clamp-6">
                    {movie.comment}
                  </p>
                ) : (
                  isWatched &&
                  !reviewsHidden && (
                    <p className="mt-2 text-xs text-[#6f759e]">
                      Отзыв не написан
                    </p>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
