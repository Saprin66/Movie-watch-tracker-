import { useEffect, useMemo, useState } from "react";
import Footer from "./Footer";
import Icon from "./Icon";
import { Logo } from "./ui";
import { POSTER, TMDB, TMDB_API_KEY } from "../config";
import { LOGIN_HASH, REGISTER_HASH } from "../legal";

const ORANGE_FILTER =
  "[filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]";

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-[14px] bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] text-[15px] font-extrabold transition-colors";
const BTN_GLASS =
  "mg-glass-btn inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-[14px] text-white text-[15px] font-bold";

const COLUMNS = 9;
const PER_COLUMN = 8;

const FEATURES = [
  {
    icon: "notebook-pen",
    title: "Личный журнал",
    text: "Отмечай, что посмотрел, что смотришь сейчас и что хочешь посмотреть потом. Фильмы и сериалы в одном месте.",
  },
  {
    icon: "star",
    title: "Оценки и отзывы",
    text: "Ставь оценки и пиши короткие рецензии, чтобы через год вспомнить, чем зацепил фильм.",
  },
  {
    icon: "users-round",
    title: "Друзья и лента",
    text: "Добавляй друзей и смотри, что они оценили. Лучший способ найти фильм на вечер.",
  },
  {
    icon: "sparkles",
    title: "Что посмотреть",
    text: "Подборки по жанрам, годам и настроению из всего каталога TMDB, а не только из твоего списка.",
  },
  {
    icon: "chart-column",
    title: "Статистика",
    text: "Сколько часов ты провёл за просмотром, любимые жанры и как менялся твой вкус.",
  },
  {
    icon: "smartphone",
    title: "Как приложение",
    text: "Установи сайт на домашний экран телефона: работает быстро и выглядит как обычное приложение.",
  },
];

const STEPS = [
  { title: "Создай аккаунт", text: "Бесплатно, нужен только email." },
  { title: "Найди фильм", text: "Поиск по всему каталогу фильмов и сериалов." },
  { title: "Оцени и поделись", text: "Поставь оценку, а друзья увидят её в ленте." },
];

// Цветные плитки на случай, если TMDB недоступен
const fallbackTiles = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: `f${i}`, h: (i * 47) % 360 }));

// Популярные постеры для фоновой сетки (несколько страниц, без повторов)
function usePosters() {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    if (!TMDB_API_KEY) return undefined;
    let cancelled = false;
    const pages = [
      `${TMDB}/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU&page=1`,
      `${TMDB}/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU&page=2`,
      `${TMDB}/movie/top_rated?api_key=${TMDB_API_KEY}&language=ru-RU&page=1`,
    ];
    Promise.all(
      pages.map((url) =>
        fetch(url)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const seen = new Set();
      const list = [];
      for (const data of results) {
        for (const m of data?.results || []) {
          if (!m.poster_path || seen.has(m.id)) continue;
          seen.add(m.id);
          list.push({ id: m.id, src: `${POSTER}${m.poster_path}` });
        }
      }
      setPosters(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return posters;
}

// Наклонённая сетка постеров: колонки бесконечно едут вверх и вниз
function PosterWall() {
  const posters = usePosters();

  const columns = useMemo(() => {
    const source = posters.length >= 20 ? posters : fallbackTiles(COLUMNS * PER_COLUMN);
    return Array.from({ length: COLUMNS }, (_, c) =>
      Array.from(
        { length: PER_COLUMN },
        (_, r) => source[(c * PER_COLUMN + r) % source.length],
      ),
    );
  }, [posters]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="mg-poster-wall">
        {columns.map((col, c) => (
          <div
            key={c}
            className={`mg-poster-col ${c % 2 ? "mg-poster-col--down" : ""}`}
            style={{ animationDuration: `${70 + (c % 4) * 12}s` }}
          >
            {/* Содержимое повторено дважды, чтобы цикл был бесшовным */}
            {[...col, ...col].map((p, i) => (
              <div
                key={`${p.id}-${i}`}
                className="aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.06] bg-mg-raised"
                style={
                  p.src
                    ? undefined
                    : {
                        background: `radial-gradient(110% 60% at 15% 0%, hsla(${p.h},90%,60%,.4), transparent 62%), linear-gradient(165deg, hsl(${p.h},45%,18%), hsl(${(p.h + 40) % 360},55%,8%))`,
                      }
                }
              >
                {p.src && (
                  <img
                    src={p.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Затемнение, чтобы текст поверх сетки читался */}
      <div className="absolute inset-0 mg-poster-veil" />
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-app mg-canvas text-white">
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
        <PosterWall />

        <header className="relative z-10 safe-top">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-4">
            <Logo size="lg" />
            <nav className="flex items-center gap-2">
              <a
                href={LOGIN_HASH}
                className="h-10 px-4 rounded-xl text-sm font-bold text-[#cfcdd8] hover:text-white transition-colors flex items-center"
              >
                Войти
              </a>
              <a
                href={REGISTER_HASH}
                className="hidden sm:flex h-10 px-4 rounded-xl text-sm font-extrabold bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] transition-colors items-center"
              >
                Регистрация
              </a>
            </nav>
          </div>
        </header>

        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-16">
            <div className="max-w-2xl mg-tab-enter">
              <span className="mg-glass-btn inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-xs font-bold text-[#ecebf1]">
                <Icon n="clapperboard" className={`w-3.5 h-3.5 ${ORANGE_FILTER}`} />
                Дневник киномана
              </span>
              <h1 className="mt-6 font-display text-[34px] leading-[1.1] sm:text-[52px] sm:leading-[1.05] font-semibold">
                Всё, что ты посмотрел,{" "}
                <span className="text-[#ff7a45]">в одном журнале</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#cfcdd8] max-w-xl">
                Отмечай фильмы и сериалы, ставь оценки, пиши отзывы и смотри,
                что советуют друзья. Это бесплатно.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href={REGISTER_HASH} className={BTN_PRIMARY}>
                  Начать бесплатно
                  <Icon n="arrow-right" className="w-4 h-4 !invert-0" />
                </a>
                <a href={LOGIN_HASH} className={BTN_GLASS}>
                  У меня есть аккаунт
                </a>
              </div>
            </div>
          </div>
        </div>

        <a
          href="#features"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="relative z-10 mx-auto mb-8 w-10 h-10 rounded-full mg-glass-btn flex items-center justify-center"
          aria-label="Подробнее о сервисе"
        >
          <Icon n="chevron-down" className="w-5 h-5" />
        </a>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <h2 className="font-display text-[26px] sm:text-[34px] font-semibold max-w-xl">
          Что умеет MovieGrade
        </h2>
        <p className="mt-3 text-[15px] text-[#8f8d9b] max-w-xl">
          Всё, чтобы не забывать хорошее кино и всегда знать, что посмотреть дальше.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[20px] border border-white/[0.07] bg-mg-sunken p-6 mg-glow-corner"
            >
              <div className="w-11 h-11 rounded-xl bg-[#ff7a45]/[0.14] flex items-center justify-center">
                <Icon n={f.icon} className={`w-5 h-5 ${ORANGE_FILTER}`} />
              </div>
              <h3 className="mt-5 text-lg font-extrabold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#a19fad]">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
        <h2 className="font-display text-[26px] sm:text-[34px] font-semibold">
          Как начать
        </h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-[20px] border border-white/[0.07] bg-mg-sunken p-6">
              <span className="font-display text-3xl font-semibold text-[#ff7a45]">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-extrabold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[#a19fad]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-16">
        <div className="rounded-[28px] mg-glow-banner bg-mg-raised border border-white/[0.08] px-6 py-12 sm:px-12 text-center">
          <h2 className="font-display text-[24px] sm:text-[32px] font-semibold">
            Начни свой киножурнал сегодня
          </h2>
          <p className="mt-3 text-[15px] text-[#ecebf1]">Регистрация занимает меньше минуты.</p>
          <a href={REGISTER_HASH} className={`${BTN_PRIMARY} mt-8`}>
            Создать аккаунт
          </a>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-10">
        <Footer />
      </div>
    </div>
  );
}
