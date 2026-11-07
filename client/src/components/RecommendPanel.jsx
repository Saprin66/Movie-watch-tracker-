import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Avatar } from "./ui";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../utils/api";
import { itemFromTmdb } from "../utils/listsApi";

const NOTE_MAX = 200;

// «Посоветовать другу»: выбор друзей и короткая записка. Живёт над панелью
// действий на странице фильма, в том же стеклянном стиле, что и «В общий список».
// movie — данные TMDB (с media_type), friends — подтверждённые друзья.
export default function RecommendPanel({ movie, friends, onClose }) {
  const { token } = useAuth();
  const item = itemFromTmdb(movie);
  const [selected, setSelected] = useState(() => new Set());
  const [alreadySent, setAlreadySent] = useState(() => new Set());
  const [note, setNote] = useState("");
  const [state, setState] = useState({ sending: false, error: "", sent: 0 });

  // Кому этот фильм уже советовали — отмечаем, чтобы не слать повторно
  useEffect(() => {
    let cancelled = false;
    apiRequest(`/recommendations/sent?tmdbId=${item.tmdbId}&mediaType=${item.mediaType}`, { token }).then((r) => {
      if (!cancelled && r.ok && Array.isArray(r.data)) setAlreadySent(new Set(r.data));
    });
    return () => {
      cancelled = true;
    };
  }, [token, item.tmdbId, item.mediaType]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    setState({ sending: true, error: "", sent: 0 });
    const toIds = [...selected];
    const result = await apiRequest("/recommendations", {
      token,
      method: "POST",
      body: { ...item, toIds, note },
    });
    if (!result.ok) {
      setState({ sending: false, error: result.error, sent: 0 });
      return;
    }
    setAlreadySent((prev) => new Set([...prev, ...toIds]));
    setSelected(new Set());
    setNote("");
    setState({ sending: false, error: "", sent: toIds.length });
  };

  return (
    <div className="mg-glass-nav mg-page-rise mb-2 rounded-[24px] p-4 max-h-[55dvh] overflow-y-auto scroll-contain">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#c4c8e4]">Посоветовать другу</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Скрыть выбор друзей"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.1]"
        >
          <Icon n="x" className="w-4 h-4 opacity-70" />
        </button>
      </div>

      {friends.length === 0 ? (
        <p className="text-sm text-[#c4c8e4]">Друзей пока нет. Найди их в разделе «Сообщество».</p>
      ) : (
        <>
          <ul className="space-y-1.5" aria-label="Друзья">
            {friends.map((f) => {
              const sent = alreadySent.has(f.id);
              const checked = selected.has(f.id);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    disabled={sent}
                    onClick={() => toggle(f.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl p-2 pl-2.5 text-left transition-colors disabled:opacity-60 ${checked ? "bg-[#ff7a45]/20" : "bg-white/[0.06] hover:bg-white/[0.1]"}`}
                  >
                    <Avatar name={f.username} avatar={f.avatar} size="w-9 h-9" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{f.username}</span>
                      {sent && <span className="block text-xs text-[#aeb3d6]">Уже советовали</span>}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center ${checked || sent ? "bg-[#ff7a45] border-[#ff7a45]" : "border-white/30"}`}
                    >
                      {(checked || sent) && <Icon n="check" className="w-3.5 h-3.5 [filter:brightness(0.1)]" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <label className="block mt-3">
            <span className="sr-only">Записка другу</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={2}
              placeholder="Пара слов, почему стоит посмотреть (необязательно)"
              className="w-full resize-none rounded-2xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-[#8b91b5] focus:outline-none focus:border-[#ff7a45]/60"
            />
          </label>

          {state.error && <p className="mt-2 text-sm text-red-300" role="alert">{state.error}</p>}
          {state.sent > 0 && !state.error && (
            <p className="mt-2 text-sm text-[#7ee2a8]" role="status">
              Отправлено. Друзья увидят совет в уведомлениях.
            </p>
          )}

          <button
            type="button"
            disabled={selected.size === 0 || state.sending}
            onClick={send}
            className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--orange mt-3 w-full h-11 rounded-full text-sm font-extrabold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Icon n="send" className="w-4 h-4" />
            {state.sending
              ? "Отправляю…"
              : selected.size > 1
                ? `Посоветовать ${selected.size} друзьям`
                : "Посоветовать"}
          </button>
        </>
      )}
    </div>
  );
}
