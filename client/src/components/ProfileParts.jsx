import { useState } from "react";
import Icon from "./Icon";
import { MONTHS, formatHours } from "../utils/watchStats";

// Общие блоки своего и чужого профиля: шапка, достижения, статистика

// Цветное свечение за стеклом и круглый аватар с ником по центру.
// avatarAction — кнопка на границе круга (смена фото), children — что под ником.
export function ProfileHero({ user, avatarAction, children }) {
  const initial = user?.username?.[0]?.toUpperCase() || "U";
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-[420px] -z-10 overflow-hidden" aria-hidden="true">
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-full h-full object-cover blur-[60px] opacity-50 scale-125" />
        ) : (
          <>
            <div className="absolute left-[10%] top-6 w-56 h-56 rounded-full bg-[#ff7a45]/40 blur-[70px]" />
            <div className="absolute right-[8%] top-24 w-56 h-56 rounded-full bg-[#8b5cf6]/40 blur-[70px]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-mg-ink/40 to-mg-ink" />
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="mg-page-poster relative">
          <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full p-[3px] bg-gradient-to-br from-[#ff7a45] via-[#ffb08c]/60 to-[#8b5cf6] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            {user?.avatar ? (
              <img src={user.avatar} alt="Аватар профиля" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-mg-pop flex items-center justify-center font-display text-[56px] font-bold text-white">
                {initial}
              </div>
            )}
          </div>
          {avatarAction}
        </div>

        <h1
          className="mg-page-rise mt-5 max-w-full font-display text-[28px] sm:text-[34px] font-bold text-white truncate"
          style={{ animationDelay: "80ms" }}
        >
          {user?.username || "Киноман"}
        </h1>
        {children}
      </div>
    </>
  );
}

// Значок достижения: открытые — оранжевое стекло, закрытые — серые с полоской прогресса
function AchievementBadge({ a, selected, onSelect }) {
  return (
    <li className="flex-1 min-w-0 sm:flex-none sm:w-[78px] text-center">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${a.name}: ${a.desc}. ${a.unlocked ? "Получено" : `${a.value} из ${a.goal}`}`}
        className="w-full transition-transform active:scale-95"
      >
        <div
          className={`relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center border transition-shadow ${
            a.unlocked
              ? "mg-glass-btn--orange border-[#ffb08c]/60 shadow-[0_6px_22px_rgba(255,122,69,0.45)]"
              : "bg-white/[0.06] border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
          } ${selected ? "ring-2 ring-white/70" : ""}`}
        >
          <Icon n={a.icon} className={`w-6 h-6 ${a.unlocked ? "" : "opacity-35"}`} />
          {!a.unlocked && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-mg-pop border border-white/15 flex items-center justify-center">
              <Icon n="lock" className="w-3 h-3 opacity-70" />
            </span>
          )}
        </div>
        <div className={`mt-2 text-[11px] font-bold leading-tight ${a.unlocked ? "text-white" : "text-[#a19fad]"}`}>
          {a.name}
        </div>
        {!a.unlocked && (
          <div className="mx-auto mt-1.5 h-1 w-12 rounded-full bg-white/10 overflow-hidden">
            <div className="mg-bar h-full rounded-full bg-[#ff7a45]" style={{ width: `${(a.value / a.goal) * 100}%` }} />
          </div>
        )}
      </button>
    </li>
  );
}

const PREVIEW = 5;

// Выполненные — сверху (в исходном порядке), остальные — по близости к цели
function sortAchievements(achievements) {
  const done = achievements.filter((a) => a.unlocked);
  const rest = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.value / b.goal - a.value / a.goal);
  return { done, rest };
}

// Строка в раскрытом списке: значок, название, условие и прогресс
function AchievementRow({ a }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3">
      <div
        className={`relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center border ${
          a.unlocked
            ? "mg-glass-btn--orange border-[#ffb08c]/60 shadow-[0_4px_16px_rgba(255,122,69,0.4)]"
            : "bg-white/[0.06] border-white/[0.12]"
        }`}
      >
        <Icon n={a.icon} className={`w-5 h-5 ${a.unlocked ? "" : "opacity-35"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm font-extrabold ${a.unlocked ? "text-white" : "text-[#cfcdd8]"}`}>{a.name}</span>
          {a.unlocked ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#58dcaa]">
              <Icon n="check" className="w-3 h-3 [filter:invert(1)_sepia(1)_saturate(3)_hue-rotate(100deg)]" /> Получено
            </span>
          ) : (
            <span className="shrink-0 text-[11px] font-bold text-[#a19fad]">
              {a.value} из {a.goal}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[#a19fad]">{a.desc}</p>
        {!a.unlocked && (
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="mg-bar h-full rounded-full bg-[#ff7a45]" style={{ width: `${(a.value / a.goal) * 100}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}

// Достижения: в свёрнутом виде — первые пять полученных (а если их нет — самые близкие),
// в раскрытом — список: полученные сверху, остальные снизу
export function AchievementsSection({ achievements }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const { done, rest } = sortAchievements(achievements);
  const preview = (done.length ? done : rest).slice(0, PREVIEW);
  const selected = preview.find((a) => a.id === selectedId) || null;

  return (
    <section className="mg-glass-panel rounded-[24px] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-white">Достижения</h2>
        <span className="mg-glass-chip mg-glass-chip--orange !py-1 !px-2.5 !text-[11px]">
          {done.length} из {achievements.length}
        </span>
      </div>

      {expanded ? (
        <div className="mg-page-rise space-y-4">
          {done.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">
                Получено · {done.length}
              </h3>
              <ul className="grid gap-2 lg:grid-cols-2">
                {done.map((a) => (
                  <AchievementRow key={a.id} a={a} />
                ))}
              </ul>
            </div>
          )}
          {rest.length > 0 && (
            <div>
              <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">
                Впереди · {rest.length}
              </h3>
              <ul className="grid gap-2 lg:grid-cols-2">
                {rest.map((a) => (
                  <AchievementRow key={a.id} a={a} />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          {!done.length && <p className="mb-3 text-sm text-[#b4b2bf]">Пока ни одного — ближе всего к этим:</p>}
          <ul className="flex justify-between sm:justify-start gap-2 sm:gap-3">
            {preview.map((a) => (
              <AchievementBadge
                key={a.id}
                a={a}
                selected={selected?.id === a.id}
                onSelect={() => setSelectedId((id) => (id === a.id ? null : a.id))}
              />
            ))}
          </ul>
          {selected && (
            <p key={selected.id} className="mg-page-rise mt-3 text-center text-sm text-[#cfcdd8]">
              <span className="font-bold text-white">{selected.name}.</span> {selected.desc}
              {selected.unlocked ? " — получено!" : ` — ${selected.value} из ${selected.goal}.`}
            </p>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setExpanded((v) => !v);
          setSelectedId(null);
        }}
        aria-expanded={expanded}
        className="mg-glass-btn mg-glass-btn--wide mt-4 w-full h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-bold text-white"
      >
        {expanded ? "Свернуть" : `Все достижения (${achievements.length})`}
        <Icon n={expanded ? "chevron-up" : "chevron-down"} className="w-4 h-4 opacity-70" />
      </button>
    </section>
  );
}

function StatTile({ value, unit, label, loading }) {
  return (
    <div className="mg-glass-chip flex-col !items-start !gap-0 !rounded-[18px] !px-3.5 !py-3 min-w-0">
      <div className="font-display text-[22px] sm:text-[26px] font-bold text-white leading-none">
        {loading ? <span className="opacity-50">…</span> : value}
        {unit && <span className="ml-1 text-sm font-bold text-[#cfcdd8]">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[11px] sm:text-xs font-bold text-[#b4b2bf] truncate max-w-full">
        {label}
      </div>
    </div>
  );
}

function StatsBlock({ title, summary, loading }) {
  const hours = formatHours(summary.minutes);
  return (
    <div>
      <h3 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#a19fad]">
        {title}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        <StatTile value={hours.value} unit={hours.unit} label="Время" loading={loading} />
        <StatTile value={summary.films} label="Фильмов" />
        <StatTile value={summary.series} label="Сериалов" />
      </div>
    </div>
  );
}

// «За всё время» и «этот месяц»; children — кнопки под цифрами
export function StatsSection({ total, month, loading, children }) {
  return (
    <section className="mg-glass-panel rounded-[24px] p-5 space-y-5">
      <StatsBlock title="За всё время" summary={total} loading={loading} />
      <StatsBlock title={`${MONTHS[new Date().getMonth()]} — этот месяц`} summary={month} loading={loading} />
      {children}
    </section>
  );
}
