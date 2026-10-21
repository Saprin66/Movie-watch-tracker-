// Цвета те же, что на сайте (client/src/components/styles.js)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  // Тема одна (тёмная), переключать её не нужно
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0a0c18", // фон
        panel: "#12152a", // карточки и окна
        deep: "#0d1021", // поля ввода внутри панелей
        card: "#1d2140", // подложка постера
        accent: "#ff7a45", // оранжевый
        "accent-light": "#ff935f",
        muted: "#8b91b5", // вторичный текст
        soft: "#aeb3d6",
        faint: "#6f759e", // подсказки в полях
        ink: "#e9ebf7", // основной светлый текст
        "on-accent": "#1b0d07", // текст на оранжевой кнопке
      },
    },
  },
  plugins: [],
};
