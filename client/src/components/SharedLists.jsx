import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Avatar, Chip, MovieCard, Grid, Poster } from "./ui";
import ConfirmDialog from "./ConfirmDialog";
import {
  BTN_ORANGE,
  BTN_RED,
  BTN_SOFT,
  DARK_ICON,
  EYEBROW,
  INPUT,
  ORANGE_FILTER,
  PAGE_TITLE,
  PANEL,
  SECTION_TITLE,
} from "./styles";
import { POSTER, TMDB, TMDB_API_KEY } from "../config";
import { fetchWithRetry } from "../utils/tmdb";
import { itemFromTmdb, listsRequest } from "../utils/listsApi";
import { pluralize } from "../utils/plural";
import { useScrollLock } from "../hooks/useScrollLock";

// Стопка аватаров участников
function Members({ members, max = 5, size = "w-8 h-8" }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div key={m.id} className={`rounded-full ring-2 ring-[#12152a] ${i > 0 ? "-ml-2" : ""}`} title={m.username}>
          <Avatar name={m.username} avatar={m.avatar} size={size} text="text-xs" />
        </div>
      ))}
      {rest > 0 && (
        <div className={`-ml-2 ${size} rounded-full ring-2 ring-[#12152a] bg-[#1d2140] flex items-center justify-center text-[11px] font-extrabold text-[#aeb3d6]`}>
          +{rest}
        </div>
      )}
    </div>
  );
}

// Окно создания списка: название и друзья
function CreateListDialog({ friends, onClose, onCreate }) {
  useScrollLock();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    const result = await onCreate(name.trim(), selected);
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-[#04050c]/80 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Новый общий список"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[480px] max-h-[92dvh] overflow-y-auto scroll-contain bg-[#12152a] border border-white/10 rounded-t-[26px] sm:rounded-[24px] p-6 sm:p-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-7 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Новый общий список</h2>
            <p className="mt-2 text-sm text-[#8b91b5]">Друзья смогут добавлять сюда фильмы, которые хотят посмотреть вместе.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.12]">
            <Icon n="x" className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="block text-[13px] font-bold text-[#aeb3d6] mb-2">Название</span>
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Пятничное кино"
            className={INPUT}
          />
        </label>

        <div className="mt-6">
          <div className="text-[13px] font-bold text-[#aeb3d6] mb-2.5">
            Кого пригласить <span className="font-medium text-[#6f759e]">друзья получат приглашение</span>
          </div>
          {friends.length === 0 ? (
            <p className="text-sm text-[#8b91b5] rounded-xl bg-white/[0.03] p-4">
              Друзей пока нет. Список можно создать и пригласить их потом.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto scroll-contain">
              {friends.map((f) => {
                const on = selected.includes(f.id);
                return (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${on ? "bg-[#ff7a45]/[0.1]" : "hover:bg-white/[0.04]"}`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(f.id)} className="w-5 h-5 accent-[#ff7a45]" />
                    <Avatar name={f.username} avatar={f.avatar} size="w-9 h-9" />
                    <span className="text-sm font-bold text-white truncate">{f.username}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-200">{error}</p>
        )}

        <button type="submit" disabled={busy || !name.trim()} className={`mt-6 w-full h-12 rounded-xl text-sm disabled:opacity-40 ${BTN_ORANGE}`}>
          {busy ? "Создаю…" : "Создать список"}
        </button>
      </form>
    </div>
  );
}

// Поиск фильма в TMDB и добавление в список
function AddMovieSearch({ existingKeys, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [adding, setAdding] = useState(null);
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  const seq = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (value) => {
    setQuery(value);
    setMessage("");
    clearTimeout(timer.current);
    if (!value.trim()) {
      setResults([]);
      setStatus("idle");
      return;
    }
    timer.current = setTimeout(async () => {
      const mySeq = ++seq.current;
      setStatus("loading");
      try {
        const res = await fetchWithRetry(
          `${TMDB}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(value)}&language=ru-RU`,
        );
        const data = await res.json();
        if (mySeq !== seq.current) return;
        setResults((data.results || []).filter((r) => r.media_type === "movie" || r.media_type === "tv").slice(0, 8));
        setStatus("idle");
      } catch {
        if (mySeq === seq.current) setStatus("error");
      }
    }, 350);
  };

  const add = async (movie) => {
    const key = `${movie.media_type}-${movie.id}`;
    setAdding(key);
    const result = await onAdd(itemFromTmdb(movie));
    setAdding(null);
    setMessage(result.ok ? `«${movie.title || movie.name}» добавлен` : result.error);
  };

  return (
    <section className={`${PANEL} p-4 sm:p-5`}>
      <label className="relative block">
        <span className="sr-only">Найти фильм, чтобы добавить в список</span>
        <Icon n="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] opacity-50" />
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Найти фильм или сериал, чтобы добавить"
          className={`${INPUT} h-12 pl-11 rounded-2xl bg-[#0d1021]`}
        />
      </label>

      {message && <p role="status" className="mt-3 text-sm font-bold text-[#58dcaa]">{message}</p>}
      {status === "loading" && <p className="mt-3 text-sm text-[#8b91b5]">Ищу…</p>}
      {status === "error" && <p className="mt-3 text-sm text-red-300">Нет связи с TMDB. Попробуй ещё раз.</p>}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {results.map((m) => {
            const key = `${m.media_type}-${m.id}`;
            const inList = existingKeys.has(key);
            const year = (m.release_date || m.first_air_date || "").slice(0, 4);
            return (
              <li key={key} className="flex items-center gap-3.5 py-2.5">
                <div className="w-11 aspect-[2/3] shrink-0 overflow-hidden rounded-lg border border-white/[0.08]">
                  <Poster src={m.poster_path ? `${POSTER}${m.poster_path}` : null} title={m.title || m.name} small />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold text-white truncate">{m.title || m.name}</div>
                  <div className="text-xs text-[#8b91b5] mt-0.5">
                    {[year, m.media_type === "tv" ? "Сериал" : "Фильм"].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {inList ? (
                  <span className="shrink-0 h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-bold text-[#58dcaa] bg-emerald-400/[0.12]">
                    <Icon n="check" className="w-4 h-4 [filter:invert(1)_sepia(1)_saturate(3)_hue-rotate(100deg)]" />
                    В списке
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={adding === key}
                    onClick={() => add(m)}
                    aria-label={`Добавить ${m.title || m.name}`}
                    className={`shrink-0 h-11 px-4 inline-flex items-center gap-1.5 rounded-xl text-[13px] disabled:opacity-50 ${BTN_ORANGE}`}
                  >
                    <Icon n="plus" className={`w-4 h-4 ${DARK_ICON}`} />
                    <span className="hidden sm:inline">Добавить</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Один общий список
function ListDetail({ listId, token, friends, onBack, onChanged, onOpenMovie }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'leave' | 'member', member? }
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    const result = await listsRequest(token, `/${listId}`);
    if (result.ok) {
      setList(result.data);
      setError("");
    } else {
      setError(result.error);
    }
  }, [listId, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !list) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="inline-flex items-center gap-2 min-h-[44px] text-sm font-bold text-[#8b91b5] hover:text-white">
          <Icon n="arrow-left" className="w-4 h-4" /> Все списки
        </button>
        <p className={`${PANEL} p-6 text-sm text-red-200`}>{error}</p>
      </div>
    );
  }

  if (!list) {
    return <div className={`${PANEL} py-16 text-center text-[#8b91b5] animate-pulse`}>Загружаю список…</div>;
  }

  const existingKeys = new Set(list.items.map((i) => `${i.mediaType}-${i.tmdbId}`));
  const toWatch = list.items.filter((i) => !i.watched);
  const watched = list.items.filter((i) => i.watched);
  const memberIds = new Set(list.members.map((m) => m.id));
  const invitable = friends.filter((f) => !memberIds.has(f.id));

  const mutate = async (path, options) => {
    const result = await listsRequest(token, path, options);
    await load();
    if (!result.ok) setError(result.error);
    onChanged();
    return result;
  };

  const runConfirm = async () => {
    setBusy(true);
    setConfirmError("");
    let result;
    if (confirm.kind === "delete") result = await listsRequest(token, `/${list.id}`, { method: "DELETE" });
    if (confirm.kind === "leave") result = await listsRequest(token, `/${list.id}/leave`, { method: "POST" });
    if (confirm.kind === "member") result = await listsRequest(token, `/${list.id}/members/${confirm.member.id}`, { method: "DELETE" });
    setBusy(false);
    if (!result.ok) return setConfirmError(result.error);
    setConfirm(null);
    onChanged();
    if (confirm.kind === "member") load();
    else onBack();
  };

  const card = (item) => (
    <MovieCard
      key={item.id}
      poster={item.posterUrl}
      title={item.title}
      onClick={() => onOpenMovie({ id: item.tmdbId, media_type: item.mediaType, title: item.title })}
      chips={
        <>
          {item.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
          {item.watched && <Chip tone="green">Посмотрели</Chip>}
        </>
      }
      footerLeft={
        <>
          {item.addedBy ? (
            <>
              <Avatar name={item.addedBy.username} avatar={item.addedBy.avatar} size="w-4 h-4" text="text-[8px]" />
              <span className="truncate">{item.addedBy.username}</span>
            </>
          ) : (
            "Удалённый пользователь"
          )}
        </>
      }
      actions={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              mutate(`/${list.id}/items/${item.id}`, { method: "PUT", body: { watched: !item.watched } });
            }}
            title={item.watched ? "Вернуть в «Хотим посмотреть»" : "Отметить, что посмотрели"}
            className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] ${BTN_SOFT}`}
          >
            <Icon n={item.watched ? "rotate-ccw" : "check"} className="w-3.5 h-3.5" />
            {item.watched ? "Вернуть" : "Посмотрели"}
          </button>
          {item.canRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                mutate(`/${list.id}/items/${item.id}`, { method: "DELETE" });
              }}
              title="Убрать из списка"
              aria-label={`Убрать ${item.title} из списка`}
              className={`px-2 rounded-lg ${BTN_RED}`}
            >
              <Icon n="trash-2" className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      }
    />
  );

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 min-h-[44px] text-sm font-bold text-[#8b91b5] hover:text-white">
        <Icon n="arrow-left" className="w-4 h-4" /> Все списки
      </button>

      <section className={`${PANEL} relative rounded-[24px] p-5 sm:p-7 mg-glow-corner`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className={`${EYEBROW} mb-2.5`}>Смотрим вместе</div>
            {renaming ? (
              <form
                className="flex flex-wrap gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const result = await mutate(`/${list.id}`, { method: "PUT", body: { name: newName } });
                  if (result.ok) setRenaming(false);
                }}
              >
                <input autoFocus value={newName} maxLength={60} onChange={(e) => setNewName(e.target.value)} className={`${INPUT} flex-1 min-w-[200px]`} aria-label="Новое название" />
                <button type="submit" className={`h-11 px-5 rounded-xl text-sm ${BTN_ORANGE}`}>Сохранить</button>
                <button type="button" onClick={() => setRenaming(false)} className={`h-11 px-4 rounded-xl text-sm ${BTN_SOFT}`}>Отмена</button>
              </form>
            ) : (
              <h1 className={`${PAGE_TITLE} break-words`}>{list.name}</h1>
            )}
            <p className="mt-2.5 text-sm text-[#8b91b5]">
              {toWatch.length} {pluralize(toWatch.length, "фильм", "фильма", "фильмов")} хотим посмотреть
              {watched.length > 0 && ` · ${watched.length} уже посмотрели`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {list.isOwner && !renaming && (
              <button onClick={() => { setNewName(list.name); setRenaming(true); }} className={`h-11 px-4 rounded-xl text-sm inline-flex items-center gap-2 ${BTN_SOFT}`}>
                <Icon n="pencil" className="w-4 h-4" /> Переименовать
              </button>
            )}
            {list.isOwner ? (
              <button onClick={() => { setConfirmError(""); setConfirm({ kind: "delete" }); }} className={`h-11 px-4 rounded-xl text-sm inline-flex items-center gap-2 ${BTN_RED}`}>
                <Icon n="trash-2" className="w-4 h-4" /> Удалить список
              </button>
            ) : (
              <button onClick={() => { setConfirmError(""); setConfirm({ kind: "leave" }); }} className={`h-11 px-4 rounded-xl text-sm inline-flex items-center gap-2 ${BTN_RED}`}>
                <Icon n="log-out" className="w-4 h-4" /> Выйти из списка
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/[0.07]">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#7b81a6] mb-3">
            Участники · {list.members.filter((m) => !m.pending).length}
            {list.members.some((m) => m.pending) && ` · приглашены ${list.members.filter((m) => m.pending).length}`}
          </div>
          <div className="flex flex-wrap gap-2">
            {list.members.map((m) => (
              <span key={m.id} className={`inline-flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full text-sm font-bold ${m.pending ? "border border-dashed border-white/15 text-[#8b91b5]" : "bg-white/[0.06] text-white"}`}>
                <span className={m.pending ? "opacity-50" : ""}>
                  <Avatar name={m.username} avatar={m.avatar} size="w-7 h-7" text="text-[11px]" />
                </span>
                {m.username}
                {m.id === list.ownerId && <span className="text-[11px] font-bold text-[#ff9a6c]">создатель</span>}
                {m.pending && <span className="text-[11px] font-semibold text-[#7b81a6]">ждёт ответа</span>}
                {list.isOwner && m.id !== list.ownerId && (
                  <button
                    type="button"
                    onClick={() => { setConfirmError(""); setConfirm({ kind: "member", member: m }); }}
                    aria-label={m.pending ? `Отменить приглашение для ${m.username}` : `Убрать ${m.username} из списка`}
                    className="-mr-1 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-500/25"
                  >
                    <Icon n="x" className="w-3.5 h-3.5 opacity-70" />
                  </button>
                )}
              </span>
            ))}
            {list.isOwner && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setInviteOpen((v) => !v)}
                  aria-expanded={inviteOpen}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-dashed border-white/20 text-sm font-bold text-[#aeb3d6] hover:text-white hover:border-white/40"
                >
                  <Icon n="user-plus" className="w-4 h-4" /> Пригласить
                </button>
                {inviteOpen && (
                  <div className="absolute left-0 top-12 z-20 w-64 rounded-2xl border border-white/10 bg-[#171b38] p-2 shadow-2xl shadow-black/50">
                    {invitable.length === 0 ? (
                      <p className="p-3 text-sm text-[#8b91b5]">Все друзья уже в списке или друзей пока нет.</p>
                    ) : (
                      invitable.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={async () => {
                            setInviteOpen(false);
                            await mutate(`/${list.id}/members`, { method: "POST", body: { userId: f.id } });
                          }}
                          className="w-full min-h-[44px] flex items-center gap-3 rounded-xl px-2.5 text-left text-sm font-bold text-white hover:bg-white/[0.06]"
                        >
                          <Avatar name={f.username} avatar={f.avatar} size="w-8 h-8" />
                          <span className="truncate">{f.username}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      <AddMovieSearch
        existingKeys={existingKeys}
        onAdd={(item) => mutate(`/${list.id}/items`, { method: "POST", body: item })}
      />

      <section className="space-y-4">
        <h2 className={SECTION_TITLE}>Хотим посмотреть</h2>
        {toWatch.length === 0 ? (
          <div className={`${PANEL} text-center py-12 px-6`}>
            <Icon n="popcorn" className={`w-8 h-8 mx-auto mb-3 ${ORANGE_FILTER}`} />
            <p className="text-white font-bold">Список пока пуст</p>
            <p className="mt-1.5 text-sm text-[#8b91b5]">Найди фильм выше или добавь его из карточки фильма кнопкой «В общий список».</p>
          </div>
        ) : (
          <Grid>{toWatch.map(card)}</Grid>
        )}
      </section>

      {watched.length > 0 && (
        <section className="space-y-4">
          <h2 className={SECTION_TITLE}>Уже посмотрели</h2>
          <Grid>{watched.map(card)}</Grid>
        </section>
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === "delete" ? "Удалить список?" : confirm.kind === "leave" ? "Выйти из списка?" : confirm.member.pending ? "Отменить приглашение?" : "Убрать участника?"
          }
          message={
            confirm.kind === "delete" ? (
              <>Вы точно хотите удалить список <b className="text-white">«{list.name}»</b>? Он пропадёт у всех участников вместе с фильмами.</>
            ) : confirm.kind === "leave" ? (
              <>Вы точно хотите выйти из списка <b className="text-white">«{list.name}»</b>? Вернуться можно, если создатель пригласит снова.</>
            ) : (
              confirm.member.pending ? (
                <>Отменить приглашение для <b className="text-white">{confirm.member.username}</b> в список «{list.name}»?</>
              ) : (
                <>Убрать <b className="text-white">{confirm.member.username}</b> из списка «{list.name}»? Добавленные им фильмы останутся.</>
              )
            )
          }
          confirmLabel={confirm.kind === "delete" ? "Удалить список" : confirm.kind === "leave" ? "Выйти" : confirm.member.pending ? "Отменить приглашение" : "Убрать"}
          icon={confirm.kind === "leave" ? "log-out" : confirm.kind === "member" ? "user-minus" : "trash-2"}
          busy={busy}
          error={confirmError}
          onConfirm={runConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// Карточка приглашения в общий список
function InviteCard({ invite, onAccept, onDecline }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`${PANEL} p-4 border-[#ff7a45]/30 mg-glow-corner`}>
      <div className="flex items-start gap-3">
        <Avatar name={invite.owner?.username} avatar={invite.owner?.avatar} size="w-11 h-11" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold text-white truncate">{invite.name}</div>
          <p className="mt-1 text-[13px] text-[#8b91b5]">
            Приглашает <b className="text-[#c4c8e4]">{invite.owner?.username || "друг"}</b>
            {invite.itemsCount > 0 && ` · ${invite.itemsCount} ${pluralize(invite.itemsCount, "фильм", "фильма", "фильмов")}`}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={busy} onClick={() => run(onAccept)} className={`flex-1 h-11 rounded-xl text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 ${BTN_ORANGE}`}>
          <Icon n="check" className={`w-4 h-4 ${DARK_ICON}`} /> Принять
        </button>
        <button type="button" disabled={busy} onClick={() => run(onDecline)} className={`flex-1 h-11 rounded-xl text-sm disabled:opacity-50 ${BTN_SOFT}`}>
          Отклонить
        </button>
      </div>
    </div>
  );
}

// Страница «Смотрим вместе»: все общие списки и открытый список
export default function SharedLists({
  token,
  friends,
  onOpenMovie,
  openListId,
  onOpenList,
  invites = [],
  onAcceptInvite,
  onDeclineInvite,
  refreshKey = 0,
}) {
  const [lists, setLists] = useState(null);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    const result = await listsRequest(token);
    if (result.ok) {
      setLists(result.data);
      setError("");
    } else {
      setError(result.error);
      setLists((prev) => prev || []);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (openListId) {
    return (
      <div className="max-w-6xl">
        <ListDetail
          listId={openListId}
          token={token}
          friends={friends}
          onBack={() => onOpenList(null)}
          onChanged={load}
          onOpenMovie={onOpenMovie}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className={`${EYEBROW} mb-2.5`}>С друзьями</div>
          <h1 className={PAGE_TITLE}>Смотрим вместе</h1>
          <p className="mt-2.5 text-sm text-[#8b91b5]">Общие списки фильмов, которые хотите посмотреть с друзьями</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm ${BTN_ORANGE}`}>
          <Icon n="plus" className={`w-4 h-4 ${DARK_ICON}`} /> Создать список
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

      {invites.length > 0 && (
        <section className="space-y-3">
          <h2 className={`${SECTION_TITLE} flex items-center gap-2.5`}>
            Приглашения
            <span className="font-sans text-xs font-extrabold min-w-[22px] h-[22px] px-2 rounded-full inline-flex items-center justify-center bg-[#ff7a45] text-[#1b0d07]">{invites.length}</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {invites.map((inv) => (
              <InviteCard key={inv.listId} invite={inv} onAccept={() => onAcceptInvite(inv)} onDecline={() => onDeclineInvite(inv)} />
            ))}
          </div>
        </section>
      )}

      {lists === null ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-56 rounded-[20px] bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : lists.length === 0 ? (
        <div className={`${PANEL} text-center py-14 px-6`}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#ff7a45]/15 flex items-center justify-center">
            <Icon n="popcorn" className={`w-7 h-7 ${ORANGE_FILTER}`} />
          </div>
          <p className="text-white font-bold">Пока нет общих списков</p>
          <p className="mt-1.5 text-sm text-[#8b91b5] max-w-sm mx-auto">Создай список, пригласи друзей, и добавляйте туда фильмы на совместный вечер.</p>
          <button onClick={() => setCreateOpen(true)} className={`mt-6 h-11 px-6 rounded-xl text-sm ${BTN_ORANGE}`}>Создать первый список</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onOpenList(l.id)}
              className={`${PANEL} group text-left p-4 transition hover:border-[#ff7a45]/40 hover:-translate-y-0.5`}
            >
              <div className="grid grid-cols-4 gap-1.5 h-[118px] overflow-hidden rounded-xl">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="overflow-hidden rounded-lg bg-white/[0.04]">
                    {l.preview[i] && <Poster src={l.preview[i].posterUrl} title={l.preview[i].title} small />}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-base font-semibold text-white truncate group-hover:text-[#ff935f] transition-colors">{l.name}</div>
                  <div className="mt-1 text-xs text-[#8b91b5]">
                    {l.itemsCount} {pluralize(l.itemsCount, "фильм", "фильма", "фильмов")}
                    {l.isOwner && <span className="text-[#ff9a6c] font-bold"> · ваш список</span>}
                  </div>
                </div>
                <Members members={l.members.filter((m) => !m.pending)} />
              </div>
            </button>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateListDialog
          friends={friends}
          onClose={() => setCreateOpen(false)}
          onCreate={async (name, memberIds) => {
            const result = await listsRequest(token, "", { method: "POST", body: { name, memberIds } });
            if (result.ok) {
              setCreateOpen(false);
              await load();
              onOpenList(result.data.id);
            }
            return result;
          }}
        />
      )}
    </div>
  );
}
