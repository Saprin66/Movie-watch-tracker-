// Тарифы подписки. Те же значения на сервере в server/plans.js — меняйте вместе.
export const PLAN_ORDER = ["free", "gold", "brilliant"];
export const PLAN_NAMES = { free: "Free", gold: "Gold", brilliant: "Brilliant" };

// Сколько общих списков можно создать
export const LIST_LIMITS = { free: 2, gold: 10, brilliant: Infinity };

export const planOf = (user) => (PLAN_ORDER.includes(user?.plan) ? user.plan : "free");
export const atLeast = (user, needed) =>
  PLAN_ORDER.indexOf(planOf(user)) >= PLAN_ORDER.indexOf(needed);

// Темы профиля для Brilliant: цвета свечения за аватаром и рамки
export const PROFILE_THEMES = [
  { id: "sunset", name: "Закат", glows: ["#ff7a45", "#8b5cf6"] },
  { id: "ocean", name: "Океан", glows: ["#22d3ee", "#2563eb"] },
  { id: "aurora", name: "Аврора", glows: ["#34d399", "#a78bfa"] },
  { id: "neon", name: "Неон", glows: ["#f472b6", "#22d3ee"] },
  { id: "rose", name: "Розовое золото", glows: ["#fda4af", "#fbbf24"] },
];
export const themeOf = (id) => PROFILE_THEMES.find((t) => t.id === id) || null;
