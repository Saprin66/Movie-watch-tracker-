import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { Avatar, Chip, Poster as PosterImage } from "./ui";
import { BTN_ORANGE, BTN_SOFT, EYEBROW, PAGE_TITLE, PANEL } from "./styles";
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
    <div className="flex items-center gap-2.5 min-w-0">
      <Avatar name={item.user.username} avatar={item.user.avatar} size="w-[34px] h-[34px]" text="text-[13px]" />
      <button
        type="button"
        onClick={() => onUserClick(item.user.id)}
        className="text-sm font-extrabold text-white hover:text-[#ff935f] transition-colors truncate"
      >
        {item.user.username}
      </button>
      <span className="text-xs text-[#7c7a88] shrink-0">
        {formatTimeAgo(item.at)}
      </span>
    </div>
  );
}

function Poster({ movie, className }) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-xl border border-white/[0.08]`}>
      <PosterImage src={movie.posterUrl} title={movie.title} small />
    </div>
  );
}

function MovieEntry({ item, onUserClick }) {
  return (
    <li className={`${PANEL} p-4 sm:p-[18px] flex gap-4 sm:gap-[18px]`}>
      <Poster movie={item.movie} className="w-[72px] sm:w-24 aspect-[2/3] self-start" />

      <div className="flex-1 min-w-0">
        <EntryHeader item={item} onUserClick={onUserClick} />

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="text-base sm:text-[17px] font-extrabold text-white truncate"
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
              className="shrink-0 flex items-baseline gap-0.5 px-3 py-1.5 rounded-xl bg-[#ff7a45]/15 text-[#ff935f]"
              aria-label={`Оценка ${item.rating} из 10`}
            >
              <span className="font-display text-xl font-bold leading-none">
                {item.rating}
              </span>
              <span className="text-[11px] opacity-70">/10</span>
            </div>
          )}
        </div>

        {item.comment && (
          <p className="mt-3 text-sm text-[#cfcdd8] leading-[1.65] whitespace-pre-line break-words line-clamp-6">
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
    <li className={`${PANEL} p-4 sm:p-[18px]`}>
      <EntryHeader item={item} onUserClick={onUserClick} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {statusChip(item.status)}
        <span className="text-sm text-[#c4c2cd]">
          Добавлено {item.count}{" "}
          {pluralize(item.count, "запись", "записи", "записей")}
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-hidden">
        {item.movies.map((movie) => (
          <Poster
            key={`${movie.mediaType}-${movie.tmdbId}`}
            movie={movie}
            className="w-12 sm:w-14 aspect-[2/3]"
          />
        ))}
        {hidden > 0 && (
          <div className="w-12 sm:w-14 aspect-[2/3] rounded-xl bg-white/5 text-[#8f8d9b] text-xs flex items-center justify-center shrink-0">
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
    <ul className="space-y-4">
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
    <div className="max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className={`${EYEBROW} mb-2.5`}>Активность</div>
          <h1 className={PAGE_TITLE}>Лента друзей</h1>
          <p className="mt-2.5 text-sm text-[#8f8d9b]">
            Что смотрят, оценивают и добавляют ваши друзья
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={`shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm ${BTN_SOFT} disabled:opacity-50`}
        >
          <Icon n="refresh-cw" /> Обновить
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="text-sm text-red-300 bg-red-500/10 rounded-xl px-4 py-3"
        >
          {error}
        </div>
      )}

      {loading && items.length === 0 && !error ? (
        <div className={`${PANEL} text-center py-16 text-[#8f8d9b] animate-pulse`}>
          Загружаю ленту...
        </div>
      ) : !hasFriends ? (
        <div className={`${PANEL} text-center py-14 px-6`}>
          <p className="text-white font-bold mb-1.5">Здесь появится активность друзей</p>
          <p className="text-sm text-[#8f8d9b] mb-5">
            Найдите друзей по нику и отправьте заявку.
          </p>
          <button
            type="button"
            onClick={onOpenFriends}
            className={`h-11 px-6 rounded-xl text-sm ${BTN_ORANGE}`}
          >
            Найти друзей
          </button>
        </div>
      ) : items.length === 0 && !error ? (
        <div className={`${PANEL} text-center py-16 text-[#8f8d9b]`}>
          Пока тихо: друзья ещё ничего не добавляли.
        </div>
      ) : (
        <FeedList items={items} onUserClick={onUserClick} />
      )}
    </div>
  );
}
