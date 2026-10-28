import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Poster } from "./ui";
import { POSTER } from "../config";
import {
  LIKES_TO_FINISH,
  MOODS,
  SOURCES,
  TIMES,
  genresOf,
  loadCandidates,
  reorderDeck,
  titleOf,
  yearOf,
} from "../utils/tonight";
import { keyOf } from "../utils/recommendations";

const ORANGE = "[filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]";
const SWIPE_AT = 110; // на сколько пикселей утащить карточку, чтобы она улетела

const posterOf = (item) => (item.poster_path ? `${POSTER}${item.poster_path}` : null);

// Кнопка-вариант ответа
function Choice({ icon, label, selected, onClick, className = "" }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`${className} flex flex-col items-center justify-center gap-2 min-h-[92px] rounded-2xl border px-3 py-3 text-sm font-bold transition ${
        selected
          ? "border-[#ff7a45] bg-[#ff7a45]/[0.14] text-[#ffb08c]"
          : "border-white/[0.08] bg-[#0d1021] text-[#c4c8e4] hover:border-white/25"
      }`}
    >
      <Icon n={icon} className={`w-6 h-6 ${selected ? ORANGE : "opacity-70"}`} />
      {label}
    </button>
  );
}

// Варианты переносятся по центру: неполный последний ряд не прижимается влево.
// width — ширина варианта с учётом отступа gap-2 (0.5rem)
function Question({ title, options, value, onChange, width = "w-[calc(50%-0.25rem)]" }) {
  return (
    <div>
      <h3 className="mb-3 text-center text-sm font-extrabold text-white">{title}</h3>
      <div role="radiogroup" aria-label={title} className="flex flex-wrap justify-center gap-2">
        {options.map((o) => (
          <Choice
            key={o.id}
            className={width}
            icon={o.icon}
            label={o.label}
            selected={value === o.id}
            onClick={() => onChange(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Карточка фильма в колоде: тащится пальцем или мышью
function SwipeCard({ item, exit, onDecide }) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const start = useRef(null);

  const onPointerDown = (e) => {
    start.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, active: true });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.x > SWIPE_AT) onDecide("like");
    else if (drag.x < -SWIPE_AT) onDecide("skip");
    else if (drag.y < -SWIPE_AT) onDecide("seen");
    setDrag({ x: 0, y: 0, active: false });
  };

  const fly = { like: "translate(140%, 0) rotate(18deg)", skip: "translate(-140%, 0) rotate(-18deg)", seen: "translate(0, -140%)" };
  const transform = exit
    ? fly[exit]
    : `translate(${drag.x}px, ${Math.min(drag.y, 0)}px) rotate(${drag.x / 18}deg)`;
  const hint = drag.x > 40 ? "like" : drag.x < -40 ? "skip" : drag.y < -40 ? "seen" : exit;

  const genres = genresOf(item);
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute inset-0 touch-none select-none cursor-grab active:cursor-grabbing"
      style={{
        transform,
        transition: drag.active ? "none" : "transform 0.3s ease-out, opacity 0.3s ease-out",
        opacity: exit ? 0 : 1,
      }}
    >
      <div className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-[#12152a] shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0">
          <Poster src={posterOf(item)} title={titleOf(item)} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#07080f] via-[#07080f]/90 to-transparent" />

        {hint && (
          <span
            className={`absolute top-6 px-4 py-1.5 rounded-xl border-2 text-lg font-extrabold uppercase tracking-wide ${
              hint === "like"
                ? "left-6 -rotate-12 border-[#30d158] text-[#30d158]"
                : hint === "skip"
                  ? "right-6 rotate-12 border-[#ff6961] text-[#ff6961]"
                  : "left-1/2 -translate-x-1/2 border-[#7ee8fa] text-[#7ee8fa]"
            }`}
          >
            {hint === "like" ? "Хочу" : hint === "skip" ? "Не сегодня" : "Видел"}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-[#c4c8e4]">
            {yearOf(item) && <span className="rounded-full bg-white/10 px-2.5 py-1">{yearOf(item)}</span>}
            {item.vote_average > 0 && (
              <span className="rounded-full bg-[#ff7a45]/20 px-2.5 py-1 text-[#ffb08c]">★ {item.vote_average.toFixed(1)}</span>
            )}
            {item.runtime && <span className="rounded-full bg-white/10 px-2.5 py-1">{item.runtime} мин</span>}
            {item.media_type === "tv" && <span className="rounded-full bg-white/10 px-2.5 py-1">Сериал</span>}
            {item.journalId && <span className="rounded-full bg-[#86b8ff]/20 px-2.5 py-1 text-[#b9d4ff]">В моём списке</span>}
          </div>
          <h3 className="mt-2.5 font-display text-[24px] sm:text-[28px] font-bold leading-tight text-white">{titleOf(item)}</h3>
          {genres.length > 0 && <p className="mt-1 text-xs font-bold text-[#9aa0c4]">{genres.join(" · ")}</p>}
          {item.overview && <p className="mt-2 text-[13px] leading-relaxed text-[#d6d9f0] line-clamp-3">{item.overview}</p>}
        </div>
      </div>
    </div>
  );
}

// Сравнение двух фильмов в дуэли
function DuelOption({ item, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex-1 min-w-0 rounded-[22px] border border-white/10 bg-[#12152a] p-2.5 text-left transition hover:-translate-y-1 hover:border-[#ff7a45]/60"
    >
      <div className="aspect-[2/3] overflow-hidden rounded-[16px]">
        <Poster src={posterOf(item)} title={titleOf(item)} />
      </div>
      <div className="px-1 pt-2.5 pb-1">
        <div className="text-sm font-extrabold text-white line-clamp-2 group-hover:text-[#ff935f]">{titleOf(item)}</div>
        <div className="mt-0.5 text-xs text-[#8b91b5]">
          {[yearOf(item), item.vote_average > 0 ? `★ ${item.vote_average.toFixed(1)}` : null].filter(Boolean).join(" · ")}
        </div>
      </div>
    </button>
  );
}

// «Что посмотреть сегодня?»: вопросы → колода свайпов → дуэль → один фильм
// onWant(item) — «Хочу»: в «Буду смотреть»; onSeen(item) — «Уже видел»: в просмотренное
export default function TonightPicker({ movies, onOpenMovie, onWant, onSeen }) {
  const [step, setStep] = useState("intro");
  const [answers, setAnswers] = useState({ mood: null, time: null, source: "new", kids: false });
  const [deck, setDeck] = useState([]);
  const [deckTotal, setDeckTotal] = useState(0);
  const [liked, setLiked] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [exit, setExit] = useState(null);
  const [duel, setDuel] = useState(null); // { champion, queue }
  const [winner, setWinner] = useState(null);
  // Подсказка под колодой: куда отправился последний фильм
  const [lastAction, setLastAction] = useState(null);
  const toastTimer = useRef(null);
  const [error, setError] = useState("");
  const shown = useRef(new Set());

  const set = (patch) => setAnswers((a) => ({ ...a, ...patch }));
  const ready = answers.mood && answers.time;

  const load = async () => {
    setStep("loading");
    setError("");
    try {
      const items = await loadCandidates(answers, movies, shown.current);
      items.forEach((item) => shown.current.add(keyOf(item.media_type, item.id)));
      setDeck(items);
      setDeckTotal(items.length);
      setStep(items.length ? "deck" : "empty");
    } catch {
      setError("Не удалось загрузить фильмы. Проверь соединение и попробуй ещё раз.");
      setStep("quiz");
    }
  };

  const restart = () => {
    shown.current = new Set();
    setDeck([]);
    setLiked([]);
    setRejected([]);
    setDuel(null);
    setWinner(null);
    setLastAction(null);
    setStep("quiz");
  };

  const startDuel = (list) => {
    if (list.length === 1) {
      setWinner(list[0]);
      setStep("result");
      return;
    }
    setDuel({ champion: list[0], queue: list.slice(1) });
    setStep("duel");
  };

  const decide = (kind) => {
    if (exit || !deck.length) return;
    const item = deck[0];
    // Реакция сразу попадает в журнал: «Хочу» — в «Буду смотреть», «Видел» — в просмотренное
    if (kind === "like") onWant?.(item);
    if (kind === "seen") onSeen?.(item);
    if (kind !== "skip") {
      clearTimeout(toastTimer.current);
      setLastAction({ kind, title: titleOf(item), mine: Boolean(item.journalId) });
      toastTimer.current = setTimeout(() => setLastAction(null), 2600);
    }
    setExit(kind);
    setTimeout(() => {
      const [current, ...rest] = deck;
      const nextLiked = kind === "like" ? [...liked, current] : liked;
      const nextRejected = kind === "skip" ? [...rejected, current] : rejected;
      setLiked(nextLiked);
      setRejected(nextRejected);
      setExit(null);
      if (nextLiked.length >= LIKES_TO_FINISH || rest.length === 0) {
        setDeck(rest);
        if (nextLiked.length) startDuel(nextLiked);
        else setStep("empty");
        return;
      }
      setDeck(reorderDeck(rest, nextLiked, nextRejected));
    }, 260);
  };

  // Стрелки на клавиатуре: ← не сегодня, → хочу, ↑ уже видел
  useEffect(() => {
    if (step !== "deck") return undefined;
    const onKey = (e) => {
      if (e.key === "ArrowRight") decide("like");
      else if (e.key === "ArrowLeft") decide("skip");
      else if (e.key === "ArrowUp") decide("seen");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Дуэль «царь горы»: выбранный остаётся и встречает следующего из очереди
  const pickInDuel = (item) => {
    const rest = duel.queue.slice(1);
    if (!rest.length) {
      setWinner(item);
      setStep("result");
      return;
    }
    setDuel({ champion: item, queue: rest });
  };

  const openWinner = () =>
    onOpenMovie({ ...winner, id: winner.id, media_type: winner.media_type, title: titleOf(winner) });

  return (
    <section className="mg-glass-panel relative overflow-hidden rounded-[28px] p-5 sm:p-8">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[#ff7a45]/15 blur-[90px]" aria-hidden="true" />

      {step === "intro" && (
        <div className="relative text-center py-4">
          <span className="mx-auto flex w-16 h-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#ff9a5c] to-[#ff5f3c] shadow-[0_14px_34px_rgba(255,122,69,0.4)]">
            <Icon n="wand-sparkles" className="w-8 h-8 [filter:brightness(0.12)]" />
          </span>
          <h2 className="mt-5 font-display text-[24px] sm:text-[28px] font-bold text-white">Что посмотреть сегодня?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#aeb3d6]">
            Три вопроса о настроении, пара свайпов — и один фильм на вечер. Меньше двух минут.
          </p>
          <button
            type="button"
            onClick={() => setStep("quiz")}
            className="mg-premium-btn mt-6 h-14 px-8 rounded-full inline-flex items-center gap-2.5 text-[15px] font-extrabold text-[#2a1600]"
          >
            <Icon n="sparkles" className="w-5 h-5 [filter:brightness(0.15)]" />
            Подобрать фильм
          </button>
        </div>
      )}

      {step === "quiz" && (
        <div className="relative mx-auto max-w-3xl space-y-7">
          <h2 className="text-center font-display text-[22px] font-bold text-white">Какой сегодня вечер?</h2>
          <Question
            title="Чего хочется?"
            options={MOODS}
            value={answers.mood}
            onChange={(mood) => set({ mood })}
            width="w-[calc(50%-0.25rem)] sm:w-[calc(20%-0.4rem)]"
          />
          <Question
            title="Сколько есть времени?"
            options={TIMES}
            value={answers.time}
            onChange={(time) => set({ time })}
            width="w-[calc(50%-0.25rem)] sm:w-[calc(25%-0.375rem)]"
          />
          <Question
            title="Откуда выбирать?"
            options={SOURCES}
            value={answers.source}
            onChange={(source) => set({ source })}
          />
          <label className="flex items-center justify-center gap-3 text-sm font-bold text-[#c4c8e4] cursor-pointer">
            <input
              type="checkbox"
              checked={answers.kids}
              onChange={(e) => set({ kids: e.target.checked })}
              className="w-5 h-5 accent-[#ff7a45]"
            />
            Смотрю с детьми
          </label>
          {error && <p role="alert" className="text-center text-sm text-[#ff6961]">{error}</p>}
          <div className="flex justify-center">
            <button
              type="button"
              disabled={!ready}
              onClick={load}
              className="min-h-[52px] px-8 rounded-full text-[15px] font-extrabold text-[#1b0d07] bg-[#ff7a45] hover:bg-[#ff9166] disabled:opacity-40 transition-colors"
            >
              {ready ? "Показать варианты" : "Выбери настроение и время"}
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <p className="relative py-20 text-center text-[#aeb3d6] animate-pulse">Подбираю фильмы под настроение…</p>
      )}

      {step === "deck" && deck.length > 0 && (
        <div className="relative mx-auto max-w-sm">
          <div className="mb-4 flex items-center justify-between text-xs font-bold text-[#8b91b5]">
            <span>Осталось {deck.length} из {deckTotal}</span>
            <span className="text-[#ff935f]">Хочу: {liked.length} из {LIKES_TO_FINISH}</span>
          </div>
          {/* Ширина зависит от высоты экрана, чтобы кнопки под карточкой были видны на телефоне */}
          <div className="relative aspect-[2/3] mx-auto" style={{ width: "min(100%, calc((100dvh - 330px) * 0.667))" }}>
            {deck[1] && (
              <div className="absolute inset-0 scale-[0.95] translate-y-3 opacity-60 overflow-hidden rounded-[28px] border border-white/10">
                <Poster src={posterOf(deck[1])} title={titleOf(deck[1])} />
              </div>
            )}
            <SwipeCard key={keyOf(deck[0].media_type, deck[0].id)} item={deck[0]} exit={exit} onDecide={decide} />
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => decide("skip")}
              aria-label="Не сегодня"
              className="mg-glass-btn w-16 h-16 rounded-full flex items-center justify-center"
            >
              <Icon n="x" className="w-7 h-7" />
            </button>
            <button
              type="button"
              onClick={() => decide("seen")}
              aria-label="Уже видел"
              title="Уже видел"
              className="mg-glass-btn w-12 h-12 rounded-full flex items-center justify-center"
            >
              <Icon n="eye" className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => decide("like")}
              aria-label="Хочу"
              className="mg-glass-btn mg-glass-btn--orange w-16 h-16 rounded-full flex items-center justify-center"
            >
              <Icon n="heart" className="w-7 h-7" />
            </button>
          </div>
          <p
            role="status"
            className={`mt-3 min-h-[18px] text-center text-xs font-bold transition-opacity ${lastAction ? "opacity-100" : "opacity-0"} ${lastAction?.kind === "seen" ? "text-[#58dcaa]" : "text-[#ff935f]"}`}
          >
            {lastAction &&
              (lastAction.kind === "seen"
                ? `«${lastAction.title}» — в просмотренное`
                : lastAction.mine
                  ? `«${lastAction.title}» уже в «Буду смотреть»`
                  : `«${lastAction.title}» — в «Буду смотреть»`)}
          </p>
          <p className="mt-1 text-center text-[11px] text-[#6f759e]">
            Вправо — хочу (в «Буду смотреть»), влево — не сегодня, вверх — уже видел (в просмотренное)
          </p>

          {liked.length >= 2 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => startDuel(liked)}
                className="text-sm font-bold text-[#ff935f] hover:text-[#ffb08c]"
              >
                Хватит, выбрать из {liked.length} →
              </button>
            </div>
          )}
        </div>
      )}

      {step === "duel" && duel && (
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="font-display text-[22px] font-bold text-white">Что интереснее прямо сейчас?</h2>
          <p className="mt-1 text-xs text-[#8b91b5]">Осталось сравнений: {duel.queue.length}</p>
          <div className="mt-5 flex items-stretch gap-3 sm:gap-4">
            <DuelOption key={`a-${duel.champion.id}`} item={duel.champion} onPick={() => pickInDuel(duel.champion)} />
            <div className="self-center shrink-0 font-display text-lg font-bold text-[#6f759e]">или</div>
            <DuelOption key={`b-${duel.queue[0].id}`} item={duel.queue[0]} onPick={() => pickInDuel(duel.queue[0])} />
          </div>
        </div>
      )}

      {step === "result" && winner && (
        <div className="mg-page-rise relative mx-auto max-w-2xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="w-44 sm:w-52 shrink-0 aspect-[2/3] overflow-hidden rounded-[22px] border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <Poster src={posterOf(winner)} title={titleOf(winner)} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ff935f]">Сегодня смотрим</div>
            <h2 className="mt-1.5 font-display text-[26px] sm:text-[32px] font-bold leading-tight text-white">{titleOf(winner)}</h2>
            <p className="mt-1 text-sm text-[#9aa0c4]">
              {[yearOf(winner), ...genresOf(winner), winner.vote_average > 0 ? `★ ${winner.vote_average.toFixed(1)}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {winner.overview && <p className="mt-3 text-sm leading-relaxed text-[#c4c8e4] line-clamp-4">{winner.overview}</p>}
            <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={openWinner}
                className="mg-glass-btn mg-glass-btn--wide mg-glass-btn--orange h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold text-white"
              >
                <Icon n="play" className="w-4 h-4" /> Где посмотреть
              </button>
              {/* Победитель — из понравившихся, поэтому он уже в «Буду смотреть» */}
              <span className="h-12 px-4 rounded-full inline-flex items-center gap-2 text-sm font-bold text-[#c4c8e4] bg-white/[0.06]">
                <Icon n="bookmark-check" className="w-4 h-4 opacity-80" /> В «Буду смотреть»
              </span>
              <button
                type="button"
                onClick={restart}
                className="mg-glass-btn mg-glass-btn--wide h-12 px-5 rounded-full inline-flex items-center gap-2 text-sm font-extrabold text-white"
              >
                <Icon n="rotate-ccw" className="w-4 h-4" /> Заново
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "empty" && (
        <div className="relative py-10 text-center">
          <h2 className="font-display text-[22px] font-bold text-white">
            {liked.length || deck.length ? "Ничего не зацепило" : "Под эти ответы ничего не нашлось"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[#aeb3d6]">
            {answers.source === "mine"
              ? "В «Буду смотреть» нет подходящего. Попробуй выбрать новое или другое настроение."
              : "Можно посмотреть ещё варианты с теми же ответами или поменять настроение."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {answers.source !== "mine" && (
              <button
                type="button"
                onClick={load}
                className="h-12 px-6 rounded-full text-sm font-extrabold text-[#1b0d07] bg-[#ff7a45] hover:bg-[#ff9166]"
              >
                Ещё варианты
              </button>
            )}
            <button
              type="button"
              onClick={restart}
              className="mg-glass-btn mg-glass-btn--wide h-12 px-6 rounded-full text-sm font-extrabold text-white"
            >
              Изменить ответы
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
