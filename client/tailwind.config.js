/** @type {import('tailwindcss').Config} */

// Цвет из CSS-переменной вида «R G B». Второй множитель (--…-a) задаёт
// прозрачность самой поверхности: на телефоне панели — полупрозрачное стекло,
// на компьютере (lg) те же классы дают плотный цвет. Значения — в index.css.
const surface = (name) => `rgb(var(--mg-${name}) / calc(<alpha-value> * var(--mg-${name}-a, 1)))`;
const solid = (name) => `rgb(var(--mg-${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Instrument Serif", "Georgia", "Times New Roman", "serif"],
      },
      colors: {
        mg: {
          bg: solid("bg"),
          ink: solid("ink"),
          pop: solid("pop"),
          panel: surface("panel"),
          sunken: surface("sunken"),
          raised: surface("raised"),
        },
      },
    },
  },
  plugins: [],
}
