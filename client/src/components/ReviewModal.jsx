import { useEffect, useState } from "react";
import Icon from "./Icon";
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Отзыв: ${movie.title}`}
        className="bg-[#171a33] border border-white/10 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto scroll-contain pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-5 p-5 sm:p-6">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="hidden sm:block w-32 h-48 object-cover rounded-xl border border-white/10 shrink-0"
            />
          ) : (
            <div className="hidden sm:flex w-32 h-48 bg-[#262b55] rounded-xl items-center justify-center shrink-0">
              <Icon n="film" className="w-8 h-8 opacity-30" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      isWatched
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-sky-500/15 text-sky-300"
                    }`}
                  >
                    {isWatched ? "Просмотрено" : "Буду смотреть"}
                  </span>
                  {movie.mediaType === "tv" && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-[#f47c4f]/15 text-[#f47c4f]">
                      Сериал
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white break-words">
                  {movie.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors shrink-0"
              >
                <Icon n="x" className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#c9cce6]">
                  {rating ? `Оценка: ${rating} из 10` : "Оценка не поставлена"}
                </span>
                {rating && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="text-xs text-[#8a90b8] hover:text-white"
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
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      rating !== null && n <= rating
                        ? "bg-[#f47c4f] text-[#1a1020]"
                        : "bg-white/5 text-[#9aa0c8] hover:bg-white/10"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {!isWatched && rating && (
                <p className="mt-2 text-xs text-[#8a90b8]">
                  С оценкой фильм перейдёт в «Просмотрено».
                </p>
              )}
            </div>

            <div className="mt-5">
              <label
                htmlFor="review-comment"
                className="block text-sm text-[#c9cce6] mb-2"
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
                className="w-full bg-[#1c2040] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60 focus:ring-1 focus:ring-[#f47c4f]/30 resize-y"
              />
              <div className="text-right text-[11px] text-[#6f759e]">
                {comment.length}/{MAX_COMMENT}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 text-sm text-red-300 bg-red-500/10 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !changed}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#f47c4f] hover:bg-[#ff8f66] text-[#1a1020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Сохраняю..." : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={onToggleStatus}
                className="px-4 py-2.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-[#c9cce6] transition-colors"
              >
                {isWatched ? "Вернуть в список" : "Отметить просмотренным"}
              </button>

              <div className="ml-auto flex items-center gap-2">
                {confirmDelete ? (
                  <>
                    <span className="text-xs text-[#8a90b8]">Удалить?</span>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="px-3 py-2 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/35 text-red-300 transition-colors"
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-[#c9cce6] transition-colors"
                    >
                      Нет
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2.5 rounded-lg text-sm bg-red-500/15 hover:bg-red-500/30 text-red-300 transition-colors"
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
