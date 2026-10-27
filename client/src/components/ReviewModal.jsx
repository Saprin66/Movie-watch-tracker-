import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Avatar, Poster } from "./ui";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useScrollLock } from "../hooks/useScrollLock";
import { useBackClose } from "../hooks/useBackClose";

const MAX_COMMENT = 1000;
const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

// В журнале постер хранится в маленьком размере — для фона берём покрупнее
const largePoster = (url) => url?.replace("/t/p/w300/", "/t/p/w500/") || null;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

// Оценки и отзывы друзей к этому же фильму
function FriendsReviews({ movie }) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, items: [], error: "" });

  useEffect(() => {
    if (!movie.tmdbId) return;
    let cancelled = false;
    const params = new URLSearchParams({ tmdbId: movie.tmdbId, mediaType: movie.mediaType || "movie" });
    fetch(`${API_URL}/api/friends/reviews?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Не удалось загрузить отзывы друзей");
        if (!cancelled) setState({ loading: false, items: Array.isArray(data) ? data : [], error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, items: [], error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [movie.tmdbId, movie.mediaType, token]);

  if (!movie.tmdbId) return null;
  const { loading, items, error } = state;

  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <h2 className="mb-4 font-display text-[17px] font-semibold text-white">
        Отзывы друзей {items.length > 0 && <span className="text-[#a19fad]">· {items.length}</span>}
      </h2>
      {loading ? (
        <div className="space-y-3 animate-pulse" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-1/3 rounded bg-white/10" />
                <div className="h-3 w-4/5 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[#b4b2bf]">Друзья ещё не оценили этот фильм.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="mg-page-rise flex gap-3">
              <Avatar name={r.user.username} avatar={r.user.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-extrabold text-white">{r.user.username}</span>
                  {r.rating && (
                    <span className="mg-glass-chip mg-glass-chip--orange !py-0.5 !px-2 !text-xs shrink-0">
                      ★ {r.rating}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 text-[11px] text-[#8f8d9b]">{formatDate(r.updatedAt)}</span>
                </div>
                {r.comment && (
                  <p className="mt-1.5 text-sm leading-relaxed text-[#ecebf1] whitespace-pre-line break-words">
                    {r.comment}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Страница оценки и отзыва к фильму из своего журнала, на весь экран
export default function ReviewModal({
  movie,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
}) {
  useScrollLock();
  const { leaving, covered, close } = useBackClose("review", onClose);

  const [rating, setRating] = useState(movie.rating ?? null);
  const [comment, setComment] = useState(movie.comment ?? "");
  // Поле отзыва раскрывается только по нажатию
  const [commentOpen, setCommentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isWatched = movie.status === "WATCHED";
  const changed =
    rating !== (movie.rating ?? null) ||
    comment.trim() !== (movie.comment ?? "");
  const posterSrc = largePoster(movie.posterUrl);

  const openComment = () => {
    setCommentOpen(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const trimmed = comment.trim();
    const result = await onSave({
      rating,
      comment: trimmed === "" ? null : trimmed,
    });
    setSaving(false);
    if (result?.ok) close();
    else setError(result?.error || "Не удалось сохранить");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Оценка: ${movie.title}`}
      className={`fixed inset-0 z-50 bg-mg-ink overflow-hidden ${leaving ? "mg-page-leave" : "mg-page-enter"} ${covered ? "mg-page-covered" : ""}`}
    >
      {/* Фон: постер сверху, слегка размыт и уходит в тёмный фон */}
      <div className="absolute inset-x-0 top-0 h-[70vh] overflow-hidden" aria-hidden="true">
        {posterSrc && (
          <img
            src={posterSrc}
            alt=""
            className="mg-page-bg absolute inset-0 w-full h-full object-cover object-center blur-[6px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-mg-ink/45 via-mg-ink/60 via-45% to-mg-ink" />
      </div>

      <div className="relative h-full overflow-y-auto scroll-contain">
        {/* Верхняя панель */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-4 sm:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
          <button
            type="button"
            onClick={close}
            aria-label="Назад"
            className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
          >
            <Icon n="arrow-left" className="w-5 h-5" />
          </button>
          {confirmDelete ? (
            <div className="mg-glass-nav mg-page-rise flex items-center gap-1 rounded-full p-1 pl-3.5">
              <span className="text-xs font-bold text-white">Удалить из журнала?</span>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  close();
                }}
                className="h-9 px-3.5 rounded-full text-xs font-extrabold text-white bg-red-500/70 hover:bg-red-500/85 transition-colors"
              >
                Да
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 px-3.5 rounded-full text-xs font-bold text-white hover:bg-white/10 transition-colors"
              >
                Нет
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Удалить из журнала"
              title="Удалить из журнала"
              className="mg-glass-btn w-11 h-11 rounded-full flex items-center justify-center"
            >
              <Icon n="trash-2" className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        <div className="px-4 sm:px-8 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
          {/* Постер и название по центру */}
          <div className="flex flex-col items-center text-center">
            <div className="mg-page-poster w-[150px] sm:w-[190px] aspect-[2/3] overflow-hidden rounded-[20px] border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
              <Poster src={posterSrc} title={movie.title} />
            </div>
            <h1
              className="mg-page-rise mt-5 max-w-[760px] font-display text-[24px] sm:text-[32px] font-bold text-white leading-[1.1] break-words"
              style={{ animationDelay: "80ms" }}
            >
              {movie.title}
            </h1>
            <div className="mg-page-rise mt-3 flex flex-wrap justify-center gap-2" style={{ animationDelay: "120ms" }}>
              <button
                type="button"
                onClick={onToggleStatus}
                title={isWatched ? "Вернуть в «Буду смотреть»" : "Отметить просмотренным"}
                className={`mg-glass-chip ${isWatched ? "mg-glass-chip--green" : "mg-glass-chip--orange"} transition-transform active:scale-95`}
              >
                <Icon n={isWatched ? "check" : "eye"} className="w-3.5 h-3.5" />
                {isWatched ? "Просмотрено" : "Буду смотреть"}
                <Icon n="repeat-2" className="w-3.5 h-3.5 opacity-60" />
              </button>
              {movie.mediaType === "tv" && <span className="mg-glass-chip">Сериал</span>}
            </div>
          </div>

          <div className="mg-page-rise mx-auto mt-7 max-w-[760px] space-y-4" style={{ animationDelay: "180ms" }}>
            {/* Оценка */}
            <section className="mg-glass-panel rounded-[24px] p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">Ваша оценка</h2>
                  <div className="mt-1 font-display text-white leading-none">
                    {rating ? (
                      <>
                        <span key={rating} className="mg-nav-pop inline-block text-[44px] font-bold text-[#ffb08c]">{rating}</span>
                        <span className="ml-1 text-lg font-bold text-[#a19fad]">/ 10</span>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-[#b4b2bf]">Не поставлена</span>
                    )}
                  </div>
                </div>
                {rating && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="min-h-[36px] px-2 text-[13px] font-bold text-[#b4b2bf] hover:text-white"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {SCALE.map((n) => {
                  const filled = rating !== null && n <= rating;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(rating === n ? null : n)}
                      aria-pressed={rating === n}
                      aria-label={`Оценка ${n}`}
                      className={`mg-glass-btn mg-glass-btn--wide aspect-square rounded-full text-[15px] font-extrabold ${
                        filled ? "mg-glass-btn--orange text-white" : "text-[#cfcdd8]"
                      }`}
                      style={{ transitionDelay: filled ? `${n * 18}ms` : "0ms" }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {!isWatched && rating && (
                <p className="mt-3 text-xs text-[#b4b2bf]">С оценкой фильм перейдёт в «Просмотрено».</p>
              )}
            </section>

            {/* Отзыв: поле раскрывается только по нажатию */}
            {commentOpen ? (
              <section className="mg-glass-panel mg-page-rise rounded-[24px] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <label htmlFor="review-comment" className="font-display text-[17px] font-semibold text-white">
                    Ваш отзыв
                  </label>
                  <button
                    type="button"
                    onClick={() => setCommentOpen(false)}
                    aria-label="Свернуть отзыв"
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.1]"
                  >
                    <Icon n="chevron-up" className="w-4 h-4 opacity-70" />
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={MAX_COMMENT}
                  rows={5}
                  placeholder="Что думаете о фильме? Отзыв видите вы и ваши друзья."
                  className="w-full rounded-[18px] bg-black/25 border border-white/[0.14] px-4 py-3.5 text-base sm:text-sm leading-relaxed text-white placeholder:text-[#8f8d9b] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus:outline-none focus:border-[#ff7a45]/70 focus:ring-[3px] focus:ring-[#ff7a45]/20 resize-y"
                />
                <div className="mt-1.5 text-right text-xs text-[#8f8d9b]">
                  {comment.length}/{MAX_COMMENT}
                </div>
              </section>
            ) : comment.trim() ? (
              <button
                type="button"
                onClick={openComment}
                className="mg-glass-panel w-full rounded-[24px] p-5 text-left transition-transform active:scale-[0.99]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-[17px] font-semibold text-white">Ваш отзыв</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#ff935f]">
                    <Icon n="pencil" className="w-3.5 h-3.5" /> Изменить
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#ecebf1] whitespace-pre-line break-words line-clamp-4">
                  {comment}
                </p>
              </button>
            ) : (
              <button
                type="button"
                onClick={openComment}
                className="mg-glass-btn mg-glass-btn--wide w-full h-14 rounded-full inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white"
              >
                <Icon n="pencil-line" className="w-[18px] h-[18px]" />
                Написать отзыв
              </button>
            )}

            {error && (
              <div role="alert" className="rounded-2xl border border-red-400/25 bg-red-500/15 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <FriendsReviews movie={movie} />
          </div>
        </div>
      </div>

      {/* Сохранение: стеклянная панель внизу, всегда под рукой */}
      <div className="mg-dock-bottom absolute z-20 left-3 right-3 mx-auto max-w-[560px]">
        <div className="mg-glass-nav rounded-full p-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !changed}
            className="w-full h-12 rounded-full inline-flex items-center justify-center gap-2 text-[15px] font-extrabold text-[#1b0d07] bg-[#ff7a45] hover:bg-[#ff8a5a] disabled:bg-white/[0.08] disabled:text-[#8f8d9b] transition-colors"
          >
            <Icon n="check" className={`w-[18px] h-[18px] ${saving || !changed ? "opacity-60" : "[filter:brightness(0.1)]"}`} />
            {saving ? "Сохраняю…" : changed ? "Сохранить" : "Нет изменений"}
          </button>
        </div>
      </div>
    </div>
  );
}
