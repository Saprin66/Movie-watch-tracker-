import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Poster } from "./ui";
import { useScrollLock } from "../hooks/useScrollLock";

const MAX_COMMENT = 1000;
const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

export default function ReviewModal({
  movie,
  onClose,
  onSave,
  onToggleStatus,
  onDelete,
}) {
  useScrollLock();

  const [rating, setRating] = useState(movie.rating ?? null);
  const [comment, setComment] = useState(movie.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isWatched = movie.status === "WATCHED";
  const changed =
    rating !== (movie.rating ?? null) ||
    comment.trim() !== (movie.comment ?? "");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const trimmed = comment.trim();
    const result = await onSave({
      rating,
      comment: trimmed === "" ? null : trimmed,
    });
    setSaving(false);
    if (result?.ok) onClose();
    else setError(result?.error || "Не удалось сохранить");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-[#04050c]/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Отзыв: ${movie.title}`}
        className="bg-[#12152a] border border-white/10 rounded-t-[26px] sm:rounded-[28px] max-w-[760px] w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scroll-contain pb-[env(safe-area-inset-bottom)] shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-7 p-5 sm:p-8">
          <div className="hidden sm:block w-[190px] aspect-[2/3] self-start shrink-0 overflow-hidden rounded-[18px] border border-white/[0.12] shadow-[0_22px_50px_rgba(0,0,0,0.5)]">
            <Poster src={movie.posterUrl} title={movie.title} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      isWatched
                        ? "bg-emerald-400/[0.14] text-[#58dcaa]"
                        : "bg-sky-400/[0.15] text-[#86b8ff]"
                    }`}
                  >
                    {isWatched ? "Просмотрено" : "Буду смотреть"}
                  </span>
                  {movie.mediaType === "tv" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ff7a45]/[0.16] text-[#ff9a6c]">
                      Сериал
                    </span>
                  )}
                </div>
                <h2 className="font-display text-[22px] sm:text-[28px] font-bold leading-tight text-white break-words">
                  {movie.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-11 h-11 flex items-center justify-center bg-white/[0.07] hover:bg-white/[0.12] rounded-full transition-colors shrink-0"
              >
                <Icon n="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[15px] font-extrabold text-white">
                  {rating ? <>Оценка: <span className="text-[#ff935f]">{rating}</span> из 10</> : "Оценка не поставлена"}
                </span>
                {rating && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="min-h-[36px] px-2 text-[13px] font-bold text-[#8b91b5] hover:text-white"
                  >
                    Сбросить
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {SCALE.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    aria-pressed={rating === n}
                    aria-label={`Оценка ${n}`}
                    className={`h-[46px] rounded-xl text-[15px] font-extrabold transition-colors ${
                      rating !== null && n <= rating
                        ? "bg-[#ff7a45] text-[#1b0d07]"
                        : "bg-white/[0.06] text-[#9aa0c6] hover:bg-white/[0.12]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {!isWatched && rating && (
                <p className="mt-2 text-xs text-[#8b91b5]">
                  С оценкой фильм перейдёт в «Просмотрено».
                </p>
              )}
            </div>

            <div className="mt-5">
              <label
                htmlFor="review-comment"
                className="block text-[15px] font-extrabold text-white mb-2.5"
              >
                Отзыв
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={MAX_COMMENT}
                rows={4}
                placeholder="Что думаете о фильме? Отзыв видите вы и ваши друзья."
                className="w-full bg-[#0d1021] border border-white/10 rounded-[14px] px-4 py-3.5 text-base sm:text-sm leading-relaxed text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 resize-y"
              />
              <div className="mt-1.5 text-right text-xs text-[#7b81a6]">
                {comment.length}/{MAX_COMMENT}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 text-sm text-red-300 bg-red-500/10 rounded-xl px-3.5 py-2.5"
              >
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !changed}
                className="h-12 px-7 rounded-xl text-sm font-extrabold bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={onToggleStatus}
                className="h-12 px-5 rounded-xl text-sm font-bold bg-white/[0.07] hover:bg-white/[0.12] text-[#e9ebf7] transition-colors"
              >
                {isWatched ? "Вернуть в список" : "Отметить просмотренным"}
              </button>

              <div className="ml-auto flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <span className="text-xs text-[#8b91b5]">Удалить?</span>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="h-11 px-4 rounded-xl text-sm font-bold bg-red-500/20 hover:bg-red-500/35 text-red-300 transition-colors"
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="h-11 px-4 rounded-xl text-sm font-bold bg-white/[0.07] hover:bg-white/[0.12] text-[#e9ebf7] transition-colors"
                    >
                      Нет
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="h-12 px-5 rounded-xl text-sm font-bold bg-red-400/[0.14] hover:bg-red-400/25 text-red-300 transition-colors"
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
