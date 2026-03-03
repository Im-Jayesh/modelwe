// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        actor: ["var(--font-actor)"],
        grotesque: ["var(--font-grotesque)"],
        didot: ["var(--font-didot)"],
        sans: ["var(--font-actor)"],
      },
    },
  },
  plugins: [],
};