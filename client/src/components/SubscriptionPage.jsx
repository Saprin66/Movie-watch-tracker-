import { useState } from "react";
import Icon from "./Icon";

// Тарифы подписки по таблице возможностей. Цены — за месяц в рублях.
const PLANS = [
  {
    id: "gold",
    name: "Gold",
    price: 149,
    icon: "crown",
    tagline: "Для тех, кто смотрит много и любит цифры",
    features: [
      "Без рекламы",
      "Статистика: топ жанров и часы просмотра",
      "До 10 общих списков «Смотрим вместе»",
      "Золотая рамка аватара и значок Gold",
      "Улучшенные рекомендации",
      "Приоритетная поддержка",
    ],
  },
  {
    id: "brilliant",
    name: "Brilliant",
    price: 299,
    icon: "gem",
    tagline: "Всё, что есть в MovieGrade, без ограничений",
    badge: "Максимум",
    features: [
      "Всё, что входит в Gold",
      "Графики активности и экспорт журнала в CSV и JSON",
      "Безлимитные общие списки",
      "Анимированная рамка, значок Brilliant и темы профиля",
      "Рекомендации на основе твоих отзывов",
      "Ранний доступ к новым функциям — например, импорт из Letterboxd",
      "Выделенная линия поддержки",
    ],
  },
];

// Полная таблица сравнения тарифов
const COMPARE = [
  ["Базовый журнал и оценки", true, true, true],
  ["Друзья и лента", true, true, true],
  ["Общие списки «Смотрим вместе»", "До 2 списков", "До 10 списков", "Безлимитно"],
  ["Реклама", "Есть", "Отключена", "Отключена"],
  ["Расширенная статистика", false, "Топ жанров, часы просмотра", "Всё из Gold + графики активности, экспорт в CSV/JSON"],
  ["Профиль и бейджи", "Стандартный", "Золотая рамка аватара, значок Gold", "Анимированная рамка, значок Brilliant, темы профиля"],
  ["Рекомендации", "Базовые, по жанрам", "Улучшенные", "Персональные, по твоим отзывам"],
  ["Ранний доступ к функциям", false, false, "Да, например импорт из Letterboxd"],
  ["Поддержка", "Стандартная", "Приоритетная", "Выделенная линия"],
];

const PLAN_ORDER = ["free", "gold", "brilliant"];

// Оформление каждого тарифа: рамка, свечение, цвет иконки и кнопки
const LOOK = {
  gold: {
    ring: "from-[#ffe08a] via-[#ffb347] to-[#ff7a45]",
    glow: "bg-[#ffb347]/25",
    tile: "bg-gradient-to-br from-[#ffe08a] to-[#ff9a3d]",
    price: "text-[#ffd27a]",
    check: "bg-[#ffb347]/[0.18]",
    button: "bg-gradient-to-r from-[#ffe08a] via-[#ffb347] to-[#ff8a50] text-[#2a1600]",
  },
  brilliant: {
    ring: "from-[#7ee8fa] via-[#a78bfa] to-[#f472b6]",
    glow: "bg-[#a78bfa]/25",
    tile: "bg-gradient-to-br from-[#7ee8fa] via-[#a78bfa] to-[#f472b6]",
    price: "text-[#c4b5fd]",
    check: "bg-[#a78bfa]/[0.2]",
    button: "bg-gradient-to-r from-[#7ee8fa] via-[#a78bfa] to-[#f472b6] text-[#16082a]",
  },
};

// Карточка тарифа. На телефоне внутри неё своя кнопка «Оформить»,
// на компьютере — общая кнопка под карточками.
function PlanCard({ plan, selected, onSelect, onSubscribe, notice, status }) {
  const look = LOOK[plan.id];
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative block w-full cursor-pointer rounded-[28px] p-[2px] text-left outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-white/60 ${
        selected ? `bg-gradient-to-br ${look.ring} shadow-[0_24px_60px_rgba(0,0,0,0.5)]` : "bg-white/[0.08]"
      }`}
    >
      <div className="relative h-full overflow-hidden rounded-[26px] bg-[#111427] p-6 sm:p-7">
        <div
          className={`pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full blur-[70px] transition-opacity duration-300 ${look.glow} ${
            selected ? "opacity-100" : "opacity-40"
          }`}
          aria-hidden="true"
        />

        <div className="relative flex items-start justify-between gap-3">
          <span className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${look.tile}`}>
            <Icon n={plan.icon} className="w-7 h-7 [filter:brightness(0.12)]" />
          </span>
          <span className="flex items-center gap-2">
            {status === "current" && (
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#12152a]">
                Ваш тариф
              </span>
            )}
            {status !== "current" && plan.badge && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${look.button}`}>
                {plan.badge}
              </span>
            )}
            <span
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selected ? "border-white bg-white" : "border-white/25"
              }`}
              aria-hidden="true"
            >
              {selected && <Icon n="check" className="w-3.5 h-3.5 [filter:brightness(0)]" />}
            </span>
          </span>
        </div>

        <h2 className="relative mt-5 font-display text-[28px] font-bold text-white">{plan.name}</h2>
        <p className="relative mt-1 text-sm text-[#aeb3d6]">{plan.tagline}</p>

        <div className="relative mt-5 flex items-baseline gap-1.5">
          <span className={`font-display text-[44px] font-bold leading-none ${look.price}`}>{plan.price} ₽</span>
          <span className="text-sm font-semibold text-[#8b91b5]">/ месяц</span>
        </div>

        <ul className="relative mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-[#e2e4f3]">
              <span className={`mt-px w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${look.check}`}>
                <Icon n="check" className="w-3 h-3" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="relative mt-7 md:hidden">
          <button
            type="button"
            disabled={Boolean(status)}
            onClick={(e) => {
              e.stopPropagation();
              onSubscribe();
            }}
            className={`w-full h-14 rounded-[18px] text-[15px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60 ${look.button}`}
          >
            {status ? STATUS_LABEL[status] : `Оформить за ${plan.price} ₽ в месяц`}
          </button>
          {notice && (
            <p role="status" className="mt-2.5 text-center text-xs text-[#aeb3d6]">
              {NOTICE}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const NOTICE = "Оплата пока недоступна — мы сообщим, когда подписку можно будет оформить.";
const STATUS_LABEL = { current: "Подключено", included: "Уже входит в ваш тариф" };

// Значение в таблице сравнения: галочка, крестик или текст
function Cell({ value }) {
  if (value === true) return <Icon n="check" className="mx-auto w-4 h-4" />;
  if (value === false) return <span className="text-[#565c80]">—</span>;
  return <span>{value}</span>;
}

// Страница выбора подписки. Оплаты пока нет: кнопка показывает, что она скоро появится.
// Ввод промокода: даёт временную подписку
function PromoForm({ onRedeem }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState({ busy: false, error: "", message: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setState({ busy: true, error: "", message: "" });
    const result = await onRedeem(code.trim());
    setState({ busy: false, error: result.success ? "" : result.error, message: result.success ? result.message : "" });
    if (result.success) setCode("");
  };

  return (
    <section className="mx-auto max-w-xl rounded-[22px] border border-white/[0.07] bg-[#111427] p-5">
      <h2 className="flex items-center gap-2.5 font-display text-[17px] font-semibold text-white">
        <Icon n="ticket" className="w-5 h-5 opacity-80" />
        Есть промокод?
      </h2>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Введи промокод"
          aria-label="Промокод"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-w-0 flex-1 h-12 rounded-xl border border-white/[0.09] bg-[#0d1021] px-4 text-base sm:text-sm font-semibold uppercase tracking-[0.08em] text-white placeholder:normal-case placeholder:tracking-normal placeholder:font-medium placeholder:text-[#6f759e] focus:outline-none focus:border-[#a78bfa]"
        />
        <button
          type="submit"
          disabled={state.busy || !code.trim()}
          className="shrink-0 h-12 px-5 rounded-xl text-sm font-extrabold text-[#16082a] bg-gradient-to-r from-[#7ee8fa] via-[#a78bfa] to-[#f472b6] disabled:opacity-50"
        >
          {state.busy ? "Проверяем…" : "Применить"}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-2.5 text-sm text-[#ff6961]">{state.error}</p>}
      {state.message && <p role="status" className="mt-2.5 text-sm font-bold text-[#30d158]">{state.message}</p>}
    </section>
  );
}

const untilLabel = (value) =>
  value ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";

export default function SubscriptionPage({ onBack, currentPlan = "free", planUntil = null, onRedeemPromo }) {
  const [selectedId, setSelectedId] = useState("brilliant");
  // current — этот тариф подключён, included — он ниже подключённого
  const statusOf = (id) =>
    id === currentPlan ? "current" : PLAN_ORDER.indexOf(id) < PLAN_ORDER.indexOf(currentPlan) ? "included" : null;
  // Для какого тарифа показать сообщение, что оплаты пока нет
  const [noticeId, setNoticeId] = useState(null);
  const plan = PLANS.find((p) => p.id === selectedId);
  const look = LOOK[plan.id];

  return (
    <div className="relative isolate mx-auto max-w-4xl pb-8 md:pb-36">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-[360px] -z-10" aria-hidden="true">
        <div className="absolute left-[12%] top-4 w-64 h-64 rounded-full bg-[#ffb347]/25 blur-[90px]" />
        <div className="absolute right-[10%] top-16 w-64 h-64 rounded-full bg-[#a78bfa]/30 blur-[90px]" />
      </div>

      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-0.5 h-11 pr-3 text-[17px] text-[#ff9a6c] hover:text-[#ffb08c]"
      >
        <Icon n="chevron-left" className="w-6 h-6 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
        Профиль
      </button>

      <div className="mg-page-rise mt-4 text-center">
        <span className="mg-glass-chip !py-1 !px-3 !text-xs text-[#e9ebf7]">
          <Icon n="sparkles" className="w-3.5 h-3.5" />
          MovieGrade Premium
        </span>
        <h1 className="mt-4 font-display text-[30px] sm:text-[40px] font-bold leading-tight text-white">Выбери подписку</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base text-[#aeb3d6]">
          Больше статистики, общих списков и красивый значок в профиле. Отменить можно в любой момент.
        </p>
        <p className="mt-3 text-sm text-[#c4c8e4]">
          Сейчас у тебя: <b className="text-white">{currentPlan === "free" ? "Free" : PLANS.find((p) => p.id === currentPlan)?.name}</b>
          {planUntil && currentPlan !== "free" && <> до {untilLabel(planUntil)}</>}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Тариф"
        className="mg-page-rise mt-9 grid grid-cols-1 gap-5 md:grid-cols-2"
        style={{ animationDelay: "80ms" }}
      >
        {PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            selected={p.id === selectedId}
            notice={noticeId === p.id}
            status={statusOf(p.id)}
            onSelect={() => {
              setSelectedId(p.id);
              setNoticeId(null);
            }}
            onSubscribe={() => {
              setSelectedId(p.id);
              setNoticeId(p.id);
            }}
          />
        ))}
      </div>

      {onRedeemPromo && (
        <div className="mg-page-rise mt-8" style={{ animationDelay: "120ms" }}>
          <PromoForm onRedeem={onRedeemPromo} />
        </div>
      )}

      <section className="mg-page-rise mt-12" style={{ animationDelay: "140ms" }}>
        <h2 className="mb-4 text-center font-display text-[22px] sm:text-[26px] font-bold text-white">Сравнение тарифов</h2>
        <div className="overflow-x-auto rounded-[22px] border border-white/[0.07] bg-[#111427]">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.07] text-xs font-extrabold uppercase tracking-[0.08em]">
                <th className="px-4 py-3.5 text-[#8b91b5]">Функция</th>
                <th className="px-4 py-3.5 text-center text-[#aeb3d6]">Free</th>
                <th className="px-4 py-3.5 text-center text-[#ffd27a]">Gold</th>
                <th className="px-4 py-3.5 text-center text-[#c4b5fd]">Brilliant</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, ...values]) => (
                <tr key={label} className="border-b border-white/[0.05] last:border-0">
                  <th scope="row" className="px-4 py-3 font-bold text-white">{label}</th>
                  {values.map((value, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 text-center text-[#c4c8e4] ${PLAN_ORDER[i] === currentPlan ? "bg-white/[0.04]" : ""}`}
                    >
                      <Cell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* На компьютере общая кнопка оформления прилипает к низу экрана */}
      <div className="hidden md:block sticky bottom-6 z-20 mt-8">
        <div className="mx-auto max-w-md rounded-[24px] border border-white/10 bg-[#12152a]/90 p-2 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            disabled={Boolean(statusOf(plan.id))}
            onClick={() => setNoticeId(plan.id)}
            className={`w-full h-14 rounded-[18px] text-[15px] font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60 ${look.button}`}
          >
            {statusOf(plan.id) ? `${plan.name}: ${STATUS_LABEL[statusOf(plan.id)].toLowerCase()}` : `Оформить ${plan.name} за ${plan.price} ₽ в месяц`}
          </button>
          <p role="status" className="px-3 pt-2 pb-1 text-center text-xs text-[#aeb3d6]">
            {noticeId === plan.id
              ? NOTICE
              : statusOf(plan.id)
                ? planUntil
                  ? `Действует до ${untilLabel(planUntil)}`
                  : "Подписка уже подключена"
                : "Подписка продлевается каждый месяц, пока ты её не отменишь."}
          </p>
        </div>
      </div>
    </div>
  );
}
