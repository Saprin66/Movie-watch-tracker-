// Общие классы оформления. Цвета поверхностей — токены mg-* (см. index.css):
// на телефоне это полупрозрачное стекло поверх «засветок», с lg — плотный графит.
// Акцент #ff7a45, вторичный текст #8f8d9b.
export const ORANGE_FILTER =
  "[filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]";

// Иконка на оранжевой кнопке становится тёмной
export const DARK_ICON = "[filter:brightness(0.1)]";

export const BTN_ORANGE =
  "bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] font-extrabold transition-colors";
export const BTN_SOFT =
  "bg-white/[0.07] hover:bg-white/[0.12] text-[#ecebf1] font-bold transition-colors";
export const BTN_RED =
  "bg-red-400/[0.14] hover:bg-red-400/25 text-red-300 font-bold transition-colors";
// Телефон: стекло с бликом по верхней кромке. Компьютер: плотная карточка с мягкой тенью
export const PANEL =
  "bg-mg-panel border border-white/[0.09] lg:border-white/[0.06] rounded-[22px] lg:rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] lg:shadow-[0_1px_2px_rgba(0,0,0,0.35),0_16px_32px_-20px_rgba(0,0,0,0.7)]";

// Подпись над заголовком страницы
export const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff8f5f]";
// Заголовок страницы (антиква: заголовки читаются как в киножурнале)
export const PAGE_TITLE =
  "font-display text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.01em] text-white";
// Заголовок раздела внутри страницы
export const SECTION_TITLE = "font-display text-[23px] sm:text-[26px] leading-tight text-white";
// Поле ввода
export const INPUT =
  "w-full bg-mg-sunken border border-white/[0.09] rounded-xl px-4 h-11 text-base sm:text-sm text-white placeholder:text-[#6f6d7b] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition";
