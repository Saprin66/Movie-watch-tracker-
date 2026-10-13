import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { Avatar, Chip } from "./ui";
import { BTN_ORANGE, BTN_SOFT, PANEL } from "./styles";
import { API_URL } from "../config";
import { formatTimeAgo } from "../utils/time";
import { pluralize } from "../utils/plural";

const statusChip = (status) =>
  status === "WATCHED" ? (
    <Chip tone="green">Просмотрено</Chip>
  ) : (
    <Chip tone="blue">Хочет посмотреть</Chip>
  );

function EntryHeader({ item, onUserClick }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Avatar name={item.user.username} size="w-8 h-8" text="text-xs" />
      <button
        type="button"
        onClick={() => onUserClick(item.user.id)}
        className="text-sm font-semibold text-white hover:text-[#f47c4f] transition-colors truncate"
      >
        {item.user.username}
      </button>
      <span className="text-xs text-[#6f759e] shrink-0">
        {formatTimeAgo(item.at)}
      </span>
    </div>
  );
}

function Poster({ movie, className }) {
  return movie.posterUrl ? (
    <img
      src={movie.posterUrl}
      alt={movie.title}
      loading="lazy"
      className={`${className} object-cover rounded-lg shrink-0`}
    />
  ) : (
    <div
      className={`${className} bg-[#262b55] rounded-lg shrink-0 flex items-center justify-center`}
    >
      <Icon n="film" className="w-5 h-5 opacity-30" />
    </div>
  );
}

function MovieEntry({ item, onUserClick }) {
  return (
    <li className={`${PANEL} p-4 flex gap-4`}>
      <Poster movie={item.movie} className="w-16 sm:w-20 aspect-[2/3] self-start" />

      <div className="flex-1 min-w-0">
        <EntryHeader item={item} onUserClick={onUserClick} />

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-base font-semibold text-white truncate"
              title={item.movie.title}
            >
              {item.movie.title}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {statusChip(item.status)}
              {item.movie.mediaType === "tv" && (
                <Chip tone="orange">Сериал</Chip>
              )}
            </div>
          </div>

          {item.rating && (
            <div
              className="shrink-0 flex items-baseline gap-0.5 px-2.5 py-1 rounded-lg bg-[#f47c4f]/15 text-[#f47c4f]"
              aria-label={`Оценка ${item.rating} из 10`}
            >
              <span className="text-lg font-bold leading-none">
                {item.rating}
              </span>
              <span className="text-[11px] opacity-70">/10</span>
            </div>
          )}
        </div>

        {item.comment && (
          <p className="mt-3 text-sm text-[#c9cce6] leading-relaxed whitespace-pre-line break-words line-clamp-6">
            {item.comment}
          </p>
        )}
      </div>
    </li>
  );
}

function BulkEntry({ item, onUserClick }) {
  const hidden = item.count - item.movies.length;

  return (
    <li className={`${PANEL} p-4`}>
      <EntryHeader item={item} onUserClick={onUserClick} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {statusChip(item.status)}
        <span className="text-sm text-[#c9cce6]">
          Добавлено {item.count}{" "}
          {pluralize(item.count, "запись", "записи", "записей")}
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-hidden">
        {item.movies.map((movie) => (
          <Poster
            key={`${movie.mediaType}-${movie.tmdbId}`}
            movie={movie}
            className="w-12 aspect-[2/3]"
          />
        ))}
        {hidden > 0 && (
          <div className="w-12 aspect-[2/3] rounded-lg bg-white/5 text-[#8a90b8] text-xs flex items-center justify-center shrink-0">
            +{hidden}
          </div>
        )}
      </div>
    </li>
  );
}

// Список записей без загрузки данных
export function FeedList({ items, onUserClick }) {
  return (
    <ul className="space-y-3">
      {items.map((item) =>
        item.type === "bulk" ? (
          <BulkEntry key={item.id} item={item} onUserClick={onUserClick} />
        ) : (
          <MovieEntry key={item.id} item={item} onUserClick={onUserClick} />
        ),
      )}
    </ul>
  );
}

export default function FriendsFeed({ token, onUserClick, onOpenFriends }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    items: [],
    hasFriends: true,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await fetch(`${API_URL}/api/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState({
        loading: false,
        error: "",
        items: Array.isArray(data.items) ? data.items : [],
        hasFriends: Boolean(data.hasFriends),
      });
    } catch (error) {
      console.error("Ошибка загрузки ленты:", error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Не удалось загрузить ленту",
      }));
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, items, hasFriends } = state;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold text-white">Лента друзей</h2>
          <p className="text-sm text-[#8a90b8]">
            Что смотрят, оценивают и добавляют ваши друзья
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${BTN_SOFT} disabled:opacity-50`}
        >
          <Icon n="refresh-cw" /> Обновить
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="text-sm text-red-300 bg-red-500/10 rounded-lg px-4 py-3"
        >
          {error}
        </div>
      )}

      {loading && items.length === 0 && !error ? (
        <div className={`${PANEL} text-center py-16 text-[#8a90b8] animate-pulse`}>
          Загружаю ленту...
        </div>
      ) : !hasFriends ? (
        <div className={`${PANEL} text-center py-14 px-6`}>
          <p className="text-[#c9cce6] mb-1">Здесь появится активность друзей</p>
          <p className="text-sm text-[#8a90b8] mb-5">
            Найдите друзей по нику и отправьте заявку.
          </p>
          <button
            type="button"
            onClick={onOpenFriends}
            className={`px-5 py-2.5 rounded-lg text-sm ${BTN_ORANGE}`}
          >
            Найти друзей
          </button>
        </div>
      ) : items.length === 0 && !error ? (
        <div className={`${PANEL} text-center py-16 text-[#8a90b8]`}>
          Пока тихо: друзья ещё ничего не добавляли.
        </div>
      ) : (
        <FeedList items={items} onUserClick={onUserClick} />
      )}
    </div>
  );
}
