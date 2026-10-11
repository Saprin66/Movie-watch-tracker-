import Icon from "./Icon";

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
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Icon n="clock" className="w-4 h-4 opacity-50" />
        Последние фильмы
      </h3>
      {reviewsHidden && (
        <p className="-mt-1 mb-3 text-xs text-[#6f759e]">
          Отзывы видны только друзьям
        </p>
      )}

      <ul className="space-y-3">
        {movies.map((movie, idx) => {
          const isWatched = movie.status === "WATCHED";
          const date = formatDate(
            isWatched && movie.watchedAt ? movie.watchedAt : movie.updatedAt,
          );

          return (
            <li
              key={movie.id || idx}
              className="flex gap-3 bg-[#1c2040] border border-white/5 rounded-xl p-3"
            >
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title || "Фильм"}
                  loading="lazy"
                  className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-lg shrink-0"
                />
              ) : (
                <div className="w-16 sm:w-20 aspect-[2/3] bg-[#262b55] rounded-lg shrink-0 flex items-center justify-center">
                  <Icon n="film" className="w-6 h-6 opacity-30" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold text-white truncate"
                      title={movie.title}
                    >
                      {movie.title || "Без названия"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          isWatched
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-sky-500/15 text-sky-300"
                        }`}
                      >
                        {isWatched ? "Просмотрено" : "Буду смотреть"}
                      </span>
                      {date && <span className="text-[#6f759e]">{date}</span>}
                    </div>
                  </div>

                  {movie.rating && (
                    <div
                      className="shrink-0 flex items-baseline gap-0.5 px-2.5 py-1 rounded-lg bg-[#f47c4f]/15 text-[#f47c4f]"
                      aria-label={`Оценка ${movie.rating} из 10`}
                    >
                      <span className="text-lg font-bold leading-none">
                        {movie.rating}
                      </span>
                      <span className="text-[11px] opacity-70">/10</span>
                    </div>
                  )}
                </div>

                {movie.comment ? (
                  <p className="mt-2 text-sm text-[#c9cce6] leading-relaxed whitespace-pre-line break-words line-clamp-6">
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
