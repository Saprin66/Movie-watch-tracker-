import Icon from "./Icon";
import { DARK_ICON, EYEBROW } from "./styles";

// Переключатель разделов «Моего списка» (журнал / сериалы / подбор) в боковой панели
export function SectionSwitch({ items, active, onChange }) {
  return (
    <div
      className="grid gap-1 p-1 rounded-xl bg-[#0d1021] border border-white/[0.08]"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      role="tablist"
    >
      {items.map((t) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={t.label}
            title={t.label}
            onClick={() => onChange(t.id)}
            className={`h-14 rounded-[9px] flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-colors ${
              selected ? "bg-[#ff7a45] text-[#1b0d07]" : "text-[#8b91b5] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            {t.icon && <Icon n={t.icon} className={`w-[18px] h-[18px] ${selected ? DARK_ICON : "opacity-70"}`} />}
            {t.short || t.label}
          </button>
        );
      })}
    </div>
  );
}

// Шапка боковой панели: «Журнал ник» и переключатель разделов — одинаковая во всех разделах
export function JournalSidebarTop({ user, subTabs, activeTab, onTab }) {
  return (
    <>
      <div>
        <div className={`${EYEBROW} mb-1.5`}>Мой список</div>
        <h1 className="font-display text-[22px] font-bold leading-tight text-white truncate">Журнал {user?.username}</h1>
      </div>
      <SectionSwitch items={subTabs} active={activeTab} onChange={onTab} />
    </>
  );
}

// Раздел «Моего списка» на компьютере: слева та же панель, что у журнала, справа содержимое.
// На телефоне панели нет — разделы переключают вкладки сверху. aside — что ещё показать в панели.
export default function JournalSection({ user, subTabs, activeTab, onTab, aside, children }) {
  return (
    <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:items-start">
      <aside className="hidden lg:block space-y-5 p-5 sticky top-[96px] max-h-[calc(100dvh-120px)] overflow-y-auto bg-[#12152a] border border-white/[0.07] rounded-[20px]">
        <div className="space-y-4">
          <JournalSidebarTop user={user} subTabs={subTabs} activeTab={activeTab} onTab={onTab} />
        </div>
        {aside && <div className="pt-5 border-t border-white/[0.07]">{aside}</div>}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
