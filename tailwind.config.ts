import type { Config } from "tailwindcss";

// ATG Mall design system.
// Brand palette: deep navy/blue (trust, international), green (logistics/growth,
// Nigeria+Gambia flag resonance), gold (premium accent, used sparingly),
// warm neutral for African-market warmth without tipping into "colorful template".
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef2f7",
          100: "#d6e0ec",
          200: "#adc1d9",
          300: "#7f9dc0",
          400: "#4f74a0",
          500: "#305582",
          600: "#203f66",
          700: "#182f4d",
          800: "#0f2038", // primary brand navy
          900: "#091426",
          950: "#050b16",
        },
        atgblue: {
          50: "#eaf3ff",
          100: "#cfe4ff",
          200: "#9ec8ff",
          300: "#69a8ff",
          400: "#3d87f5",
          500: "#1f6ce0", // primary accent blue
          600: "#1554b3",
          700: "#123f89",
          800: "#102f66",
          900: "#0b2049",
        },
        atggreen: {
          50: "#eafaf1",
          100: "#c9f0da",
          200: "#96e0b7",
          300: "#5fca92",
          400: "#33ac72",
          500: "#1f8f5b", // primary green
          600: "#177249",
          700: "#135b3b",
          800: "#0f462e",
          900: "#0a3021",
        },
        gold: {
          50: "#fdf8ec",
          100: "#f9edc8",
          200: "#f2d98c",
          300: "#e9c05a",
          400: "#dba934", // accent gold, sparing use
          500: "#c1912a",
          600: "#987221",
          700: "#71541a",
        },
        sand: {
          50: "#faf8f4",
          100: "#f3efe6",
          200: "#e7ddc9",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-manrope)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(9,20,38,0.06), 0 8px 24px -12px rgba(9,20,38,0.18)",
        "card-hover": "0 4px 10px rgba(9,20,38,0.08), 0 16px 36px -14px rgba(9,20,38,0.28)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "navy-gradient": "linear-gradient(135deg, #091426 0%, #0f2038 45%, #123f89 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
