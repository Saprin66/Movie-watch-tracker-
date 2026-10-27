import Icon from "./Icon";

// Рекламный блок для тарифа Free. Пока своих рекламодателей нет, здесь реклама
// подписки; в Gold и Brilliant блок не показывается.
export default function AdBanner({ onOpenPremium, className = "" }) {
  return (
    <aside
      aria-label="Реклама"
      className={`relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#12152a] p-4 sm:p-5 ${className}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-16 w-48 h-48 rounded-full bg-[#ffb347]/20 blur-[60px]" aria-hidden="true" />
      <div className="relative flex items-center gap-4">
        <span className="hidden sm:flex w-12 h-12 shrink-0 rounded-2xl items-center justify-center bg-gradient-to-br from-[#ffe08a] to-[#ff9a3d]">
          <Icon n="crown" className="w-6 h-6 [filter:brightness(0.12)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6f759e]">Реклама</div>
          <p className="mt-0.5 text-sm font-bold text-white">Без рекламы и с подробной статистикой — в MovieGrade Gold</p>
          <p className="mt-0.5 text-xs text-[#8b91b5]">Топ жанров, часы просмотра и до 10 общих списков за 149 ₽ в месяц</p>
        </div>
        <button
          type="button"
          onClick={onOpenPremium}
          className="shrink-0 h-10 px-4 rounded-xl text-[13px] font-extrabold text-[#2a1600] bg-gradient-to-r from-[#ffe08a] via-[#ffb347] to-[#ff8a50]"
        >
          Подробнее
        </button>
      </div>
    </aside>
  );
}
