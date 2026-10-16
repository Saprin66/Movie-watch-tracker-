// Общие классы оформления. Палитра: фон #0a0c18, панели #12152a,
// акцент #ff7a45, вторичный текст #8b91b5.
export const ORANGE_FILTER =
  "[filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]";

// Иконка на оранжевой кнопке становится тёмной
export const DARK_ICON = "[filter:brightness(0.1)]";

export const BTN_ORANGE =
  "bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] font-extrabold transition-colors";
export const BTN_SOFT =
  "bg-white/[0.07] hover:bg-white/[0.12] text-[#e9ebf7] font-bold transition-colors";
export const BTN_RED =
  "bg-red-400/[0.14] hover:bg-red-400/25 text-red-300 font-bold transition-colors";
export const PANEL = "bg-[#12152a] border border-white/[0.07] rounded-[20px]";

// Подпись над заголовком страницы
export const EYEBROW =
  "text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ff8f5f]";
// Заголовок страницы
export const PAGE_TITLE =
  "font-display text-[26px] sm:text-[32px] font-bold leading-tight text-white";
// Заголовок раздела внутри страницы
export const SECTION_TITLE = "font-display text-[17px] sm:text-lg font-semibold text-white";
// Поле ввода
export const INPUT =
  "w-full bg-[#12152a] border border-white/[0.08] rounded-xl px-4 h-11 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition";
