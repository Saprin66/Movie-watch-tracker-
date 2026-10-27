// Тарифы подписки. Оплаты пока нет: тариф выдаётся вручную в базе (поле User.plan).
// Те же значения есть на клиенте в client/src/utils/plans.js — меняйте вместе.

const PLANS = ['free', 'gold', 'brilliant'];
const PLAN_NAMES = { free: 'Free', gold: 'Gold', brilliant: 'Brilliant' };

// Сколько общих списков можно создать (Infinity — без ограничений)
const LIST_LIMITS = { free: 2, gold: 10, brilliant: Infinity };

// Темы профиля, которые может выбрать владелец Brilliant
const PROFILE_THEMES = ['sunset', 'ocean', 'aurora', 'neon', 'rose'];

// Промокоды: код (без учёта регистра) → какой тариф и на сколько дней
const PROMO_CODES = {
  saprinkrut: { plan: 'brilliant', days: 30 },
};

const rank = (plan) => (PLANS.includes(plan) ? PLANS.indexOf(plan) : 0);

// Поля пользователя, нужные для расчёта действующего тарифа
const PLAN_SELECT = { plan: true, promoPlan: true, promoUntil: true };

// Действующий тариф: основной или промо, если промо ещё не истекло и оно выше
const planOf = (user, now = new Date()) => {
  const base = PLANS.includes(user?.plan) ? user.plan : 'free';
  const promoActive = user?.promoPlan && user?.promoUntil && new Date(user.promoUntil) > now;
  return promoActive && rank(user.promoPlan) > rank(base) ? user.promoPlan : base;
};

// До какого числа действует тариф (null — бессрочно)
const planUntilOf = (user, now = new Date()) =>
  planOf(user, now) !== (PLANS.includes(user?.plan) ? user.plan : 'free') ? user.promoUntil : null;

const atLeast = (plan, needed) => rank(plan) >= rank(needed);

module.exports = {
  PLANS, PLAN_NAMES, LIST_LIMITS, PROFILE_THEMES, PROMO_CODES, PLAN_SELECT,
  planOf, planUntilOf, atLeast,
};
