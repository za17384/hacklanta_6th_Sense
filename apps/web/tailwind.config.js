/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stage: { 950: "#07040f", 900: "#0e0820", 800: "#1a1033", 700: "#2a1a4d" },
        neon: { pink: "#ff3ea5", cyan: "#22e3ff", lime: "#b6ff3b", amber: "#ffb020" },
        formup: {
          bg: "#101626",
          card: "#1b2338",
          raised: "#242c43",
          line: "#313a56",
          lav: "#b197ff",
          ink: "#160d32",
          mint: "#86f0ac",
          muted: "#a7adbf",
          faint: "#7d849a",
          text: "#f4f5f7",
        },
      },
      fontFamily: { display: ['"Bungee"', "system-ui", "sans-serif"], body: ['"Inter"', "system-ui", "sans-serif"] },
      keyframes: {
        beam: { "0%,100%": { transform: "rotate(-14deg)", opacity: ".35" }, "50%": { transform: "rotate(14deg)", opacity: ".6" } },
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "60%": { transform: "scale(1.15)" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: { beam: "beam 6s ease-in-out infinite", pop: "pop .35s ease-out both" },
    },
  },
  plugins: [],
};
