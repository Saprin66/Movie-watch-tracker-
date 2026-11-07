import { useEffect, useState } from "react";
import Icon from "./Icon";
import Footer from "./Footer";
import { Logo, Poster } from "./ui";
import { ProfileHero, PrivateProfileNotice } from "./ProfileParts";
import { useAuth } from "../context/AuthContext";
import { leaveHashRoute } from "../hooks/useHashRoute";
import { REGISTER_HASH } from "../legal";
import { apiRequest, publicProfileUrl } from "../utils/api";
import { pluralize } from "../utils/plural";

const BTN_PRIMARY =
  "whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] text-sm font-extrabold transition-colors";
const BTN_GLASS =
  "mg-glass-btn whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-white text-sm font-bold";

const ORANGE = "[filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]";

function StatTile({ value, label }) {
  return (
    <div className="mg-glass-chip flex-col !items-start !gap-0 !rounded-[18px] !px-3.5 !py-3 min-w-0">
      <div className="font-display text-[22px] sm:text-[26px] font-bold text-white leading-none">{value}</div>
      <div className="mt-1.5 text-[11px] sm:text-xs font-bold text-[#aeb3d6] truncate max-w-full">{label}</div>
    </div>
  );
}

// Полка постеров с оценкой владельца профиля
function Shelf({ title, movies }) {
  if (!movies?.length) return null;
  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <h2 className="mb-4 font-display text-[17px] font-semibold text-white">{title}</h2>
      <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {movies.map((m) => (
          <li key={`${m.mediaType}-${m.tmdbId}`} className="min-w-0">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#12152a] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              <Poster src={m.posterUrl} title={m.title} small />
              {m.rating ? (
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur px-2 py-0.5 text-[11px] font-extrabold text-white">
                  <Icon n="star" className={`w-3 h-3 ${ORANGE}`} />
                  {m.rating}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs font-bold text-[#d6d9f0] truncate" title={m.title}>{m.title}</p>
            {m.releaseYear ? <p className="text-[11px] text-[#7b81a6]">{m.releaseYear}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Кнопка «Поделиться»: системное меню на телефоне, иначе копирование ссылки
export function ShareProfileButton({ username, className = BTN_GLASS, label = "Поделиться" }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = publicProfileUrl(username);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${username} в MovieGrade`, url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Скопируйте ссылку на профиль", url);
    }
  };
  return (
    <button type="button" onClick={share} className={className}>
      <Icon n={copied ? "check" : "share-2"} className="w-4 h-4" />
      {copied ? "Ссылка скопирована" : label}
    </button>
  );
}

// Публичная страница профиля по ссылке #/u/<ник>: открывается и без входа
export default function PublicProfilePage({ username }) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, profile: null, error: "" });

  useEffect(() => {
    // Смена ника в адресе пересоздаёт страницу (key в App), так что начальное состояние уже «загрузка»
    let cancelled = false;
    apiRequest(`/public/users/${encodeURIComponent(username)}`).then((r) => {
      if (cancelled) return;
      if (r.ok) setState({ loading: false, profile: r.data, error: "" });
      else setState({ loading: false, profile: null, error: r.status === 404 ? "not-found" : r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const { loading, profile, error } = state;

  useEffect(() => {
    const prev = document.title;
    if (profile) document.title = `${profile.username} — MovieGrade`;
    return () => {
      document.title = prev;
    };
  }, [profile]);

  const stats = profile?.stats;
  const joined = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-app bg-[#080a16] text-[#c4c8e4]">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#080a16]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={leaveHashRoute} aria-label="На главную MovieGrade">
            <Logo />
          </button>
          {token ? (
            <button type="button" onClick={leaveHashRoute} className={BTN_GLASS}>
              Открыть MovieGrade
            </button>
          ) : (
            <a href={REGISTER_HASH} className={BTN_PRIMARY}>
              Создать аккаунт
            </a>
          )}
        </div>
      </header>

      <main className="relative isolate mx-auto max-w-5xl px-4 pt-10 pb-12">
        {loading && (
          <div className="flex justify-center py-24" role="status" aria-label="Загрузка профиля">
            <Icon n="loader-circle" className="w-8 h-8 animate-spin opacity-60" />
          </div>
        )}

        {!loading && error && (
          <section className="mg-glass-panel mx-auto max-w-md rounded-[28px] px-6 py-10 text-center">
            <Icon n="user-x" className="mx-auto w-10 h-10 opacity-60" />
            <h1 className="mt-4 font-display text-[22px] font-bold text-white">
              {error === "not-found" ? "Профиль не найден" : "Не удалось загрузить профиль"}
            </h1>
            <p className="mt-2 text-sm text-[#aeb3d6]">
              {error === "not-found" ? "Проверьте ссылку: возможно, ник изменился." : error}
            </p>
          </section>
        )}

        {profile && (
          <>
            <ProfileHero user={profile}>
              {profile.bio && (
                <p className="mg-page-rise mt-3 max-w-md text-sm leading-relaxed text-[#d6d9f0] whitespace-pre-line break-words">
                  {profile.bio}
                </p>
              )}
              {joined && <p className="mt-2 text-xs text-[#7b81a6]">В MovieGrade с {joined}</p>}
              {!profile.isPrivate && (
                <div className="mt-5">
                  <ShareProfileButton username={profile.username} />
                </div>
              )}
            </ProfileHero>

            <div className="mg-page-rise mt-8 space-y-4" style={{ animationDelay: "140ms" }}>
              {profile.isPrivate ? (
                <PrivateProfileNotice
                  username={profile.username}
                  action={!token && <a href={REGISTER_HASH} className={BTN_PRIMARY}>Создать аккаунт и добавить в друзья</a>}
                />
              ) : (
                <>
                  <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatTile value={stats.watchedMovies} label={pluralize(stats.watchedMovies, "фильм", "фильма", "фильмов")} />
                    <StatTile value={stats.watchedSeries} label={pluralize(stats.watchedSeries, "сериал", "сериала", "сериалов")} />
                    <StatTile value={stats.averageRating ?? "—"} label="Средняя оценка" />
                    <StatTile value={stats.friends} label={pluralize(stats.friends, "друг", "друга", "друзей")} />
                  </section>

                  {profile.topGenres?.length > 0 && (
                    <section className="mg-glass-panel rounded-[24px] p-5">
                      <h2 className="mb-3 font-display text-[17px] font-semibold text-white">Любимые жанры</h2>
                      <ul className="flex flex-wrap gap-2">
                        {profile.topGenres.map((g) => (
                          <li key={g.name} className="mg-glass-chip !py-1.5 !px-3 !text-[13px] text-white">
                            {g.name} <span className="text-[#9aa0c4]">· {g.count}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <Shelf title="Лучшее по оценке" movies={profile.topRated} />
                  <Shelf title="Недавно просмотренное" movies={profile.recent} />

                  {!stats.watchedMovies && !stats.watchedSeries && (
                    <p className="py-6 text-center text-sm text-[#aeb3d6]">Журнал пока пуст.</p>
                  )}
                </>
              )}

              {!token && (
                <section className="mg-glass-panel relative overflow-hidden rounded-[28px] px-6 py-8 text-center">
                  <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#ff7a45]/20 blur-[80px]" aria-hidden="true" />
                  <h2 className="relative font-display text-[22px] font-bold text-white">Ведите свой киножурнал</h2>
                  <p className="relative mx-auto mt-2 max-w-md text-sm text-[#aeb3d6]">
                    Отмечайте фильмы и сериалы, ставьте оценки и смотрите, что смотрят друзья. Бесплатно.
                  </p>
                  <a href={REGISTER_HASH} className={`relative mt-5 ${BTN_PRIMARY}`}>
                    Присоединиться к MovieGrade
                  </a>
                </section>
              )}
            </div>
          </>
        )}

        <Footer className="mt-12" />
      </main>
    </div>
  );
}
