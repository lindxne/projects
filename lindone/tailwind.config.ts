import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "system-ui", "sans-serif"],
      },
      colors: {
        // Page background (near-white) and text (near-black).
        ink: {
          DEFAULT: "#fafaf9",
          soft: "#f2f2f0",
        },
        mist: {
          DEFAULT: "#111113",
          muted: "#5b5b63",
          faint: "#8b8b93",
        },
        glow: {
          violet: "#7a45ff",
          pink: "#f0409a",
          blue: "#3a78ff",
          teal: "#19b9c9",
          amber: "#ff9a4d",
        },
      },
      borderRadius: {
        glass: "28px",
      },
      screens: {
        xs: "400px",
      },
      keyframes: {
        sheen: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(320%)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(4%, -6%, 0) scale(1.12)" },
        },
      },
      animation: {
        sheen: "sheen 2.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        drift: "drift 26s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
