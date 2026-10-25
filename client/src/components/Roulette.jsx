import { useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Poster, SubTabs } from "./ui";

const KINDS = [
  { id: "all", label: "Всё" },
  { id: "movie", label: "Фильмы" },
  { id: "tv", label: "Сериалы" },
];

const TILE = 96; // ширина постера в ленте, px
const GAP = 12;
const STEP = TILE + GAP;
const REEL_LENGTH = 34; // сколько постеров пролетает за один прокрут
const WINNER_AT = 28; // на каком месте ленты стоит выпавший фильм
const SPIN_MS = 3600;

const typeOf = (movie) => (movie.mediaType === "tv" ? "tv" : "movie");
const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

// Лента постеров: случайные фильмы из списка, на месте WINNER_AT — победитель
function buildReel(list, winner) {
  return Array.from({ length: REEL_LENGTH }, (_, i) =>
    i === WINNER_AT ? winner : randomOf(list),
  );
}

// «Рулетка»: случайный фильм из «Буду смотреть» с прокруткой ленты постеров
export default function Roulette({ movies, onOpenMovie, onMarkWatched }) {
  const [kind, setKind] = useState("all");
  const [reel, setReel] = useState([]);
  const [offset, setOffset] = useState(0);
  // idle — покой, reset — лента мгновенно встаёт в начало, spin — прокрут, settle — доводка
  const [phase, setPhase] = useState("idle");
  const spinning = phase === "reset" || phase === "spin";
  const [winner, setWinner] = useState(null);
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const watchlist = movies.filter(
    (m) => m.status === "WATCHLIST" && (kind === "all" || typeOf(m) === kind),
  );

  // Ширина окна ленты нужна, чтобы победитель остановился точно под указателем
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [watchlist.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const centerOf = (index) => -(index * STEP) + viewportWidth / 2 - TILE / 2;

  const spin = () => {
    if (spinning || watchlist.length === 0) return;
    const next = randomOf(watchlist);
    // Новая лента начинается с текущего фильма, чтобы не было рывка
    const start = winner || randomOf(watchlist);
    const fresh = buildReel(watchlist, next);
    fresh[0] = start;
    setWinner(null);
    setReel(fresh);
    setPhase("reset");
    setOffset(centerOf(0));
    // Двойной кадр: сначала лента встаёт в начало без анимации, затем запускаем прокрут
    // и останавливаемся чуть мимо центра — доводка в конце выглядит живее
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase("spin");
        setOffset(centerOf(WINNER_AT) + (Math.random() - 0.5) * TILE * 0.5);
      }),
    );
    setTimeout(() => {
      setPhase("settle");
      setOffset(centerOf(WINNER_AT));
      setWinner(next);
    }, SPIN_MS);
  };

  // Пока не крутили — показываем ленту из списка, чтобы было видно, из чего выбираем
  const idleReel = reel.length ? reel : watchlist.slice(0, 12);

  return (
    <section className="mg-glass-panel relative overflow-hidden rounded-[24px] p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] font-semibold text-white">Рулетка</h2>
          <p className="mt-1 text-[13px] text-[#b4b2bf]">Случайный фильм из «Буду смотреть»</p>
        </div>
        <SubTabs
          items={KINDS}
          active={kind}
          onChange={(k) => {
            if (spinning) return;
            setKind(k);
            setReel([]);
            setWinner(null);
          }}
          className="flex w-full sm:w-auto"
          itemClass="sm:w-[100px]"
        />
      </div>

      {watchlist.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#b4b2bf]">
          В «Буду смотреть» пока ничего нет{kind !== "all" ? " для этого фильтра" : ""}. Добавьте
          фильмы через поиск или из подборки ниже.
        </p>
      ) : (
        <>
          <div ref={viewportRef} className="relative -mx-5 sm:-mx-7 overflow-hidden py-3">
            {/* Указатель по центру */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2 w-[104px] rounded-[18px] border-2 border-[#ff7a45] shadow-[0_0_30px_rgba(255,122,69,0.45)]" />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#24222c] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#24222c] to-transparent" />
            <div
              className="flex"
              style={{
                gap: GAP,
                transform: `translateX(${reel.length ? offset : 20}px)`,
                transition:
                  phase === "reset"
                    ? "none"
                    : phase === "spin"
                      ? `transform ${SPIN_MS - 200}ms cubic-bezier(0.12, 0.75, 0.15, 1)`
                      : "transform 0.35s ease-out",
              }}
            >
              {idleReel.map((m, i) => (
                <div
                  key={i}
                  className={`shrink-0 aspect-[2/3] overflow-hidden rounded-[14px] border border-white/15 transition-[opacity,transform] duration-500 ${
                    winner && i === WINNER_AT ? "scale-105" : winner ? "opacity-40" : ""
                  }`}
                  style={{ width: TILE }}
                >
                  <Poster src={m.posterUrl} title={m.title} small />
                </div>
              ))}
            </div>
          </div>

          {winner ? (
            <div className="mg-page-rise mt-4 text-center">
              <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ff935f]">Сегодня смотрим</div>
              <h3 className="mt-1.5 font-display text-[22px] sm:text-[26px] font-bold text-white break-words">{winner.title}</h3>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenMovie(
                      winner.tmdbId
                        ? { id: winner.tmdbId, media_type: typeOf(winner), title: winner.title, posterUrl: winner.posterUrl }
                        : winner,
                    )
                  }
                  className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--orange h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold text-white"
                >
                  <Icon n="info" className="w-4 h-4" /> Подробнее
                </button>
                <button
                  type="button"
                  onClick={spin}
                  className="mg-glass-btn mg-glass-btn--wide h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold text-white"
                >
                  <Icon n="shuffle" className="w-4 h-4" /> Ещё раз
                </button>
                <button
                  type="button"
                  onClick={() => onMarkWatched(winner.id)}
                  className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--green h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold text-white"
                >
                  <Icon n="check" className="w-4 h-4" /> Уже посмотрел
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={spin}
                disabled={spinning}
                className="mg-premium-btn h-14 px-8 rounded-full inline-flex items-center gap-2.5 text-[15px] font-extrabold text-[#2a1600] disabled:opacity-80"
              >
                <Icon n="dices" className={`w-5 h-5 [filter:brightness(0.15)] ${spinning ? "animate-spin" : ""}`} />
                {spinning ? "Крутим…" : "Крутить рулетку"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
