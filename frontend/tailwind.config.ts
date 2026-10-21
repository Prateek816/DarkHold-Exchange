import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#04060A",
          elevated: "#080B10",
          subtle: "#0B0E15",
        },
        glass: {
          fill: "rgba(255, 255, 255, 0.035)",
          "fill-hover": "rgba(255, 255, 255, 0.055)",
          "fill-active": "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.08)",
          "border-strong": "rgba(255, 255, 255, 0.14)",
          highlight: "rgba(255, 255, 255, 0.07)",
        },
        text: {
          DEFAULT: "#F2F5F7",
          muted: "#8B94A3",
          dim: "#5B6472",
        },
        brand: {
          400: "#3EE6C8",
          500: "#19CBB0",
          600: "#0E9F8E",
          glow: "rgba(25, 203, 176, 0.35)",
          subtle: "rgba(25, 203, 176, 0.12)",
        },
        violet: {
          400: "#9B82FF",
          500: "#7C5CFF",
          glow: "rgba(124, 92, 255, 0.35)",
          subtle: "rgba(124, 92, 255, 0.14)",
        },
        sim: {
          DEFAULT: "#7C5CFF",
          400: "#9B82FF",
          bg: "rgba(124, 92, 255, 0.14)",
          border: "rgba(124, 92, 255, 0.35)",
          glow: "rgba(124, 92, 255, 0.35)",
        },
        buy: {
          DEFAULT: "#22C55E",
          text: "#3DDC84",
          bg: "rgba(34, 197, 94, 0.14)",
          border: "rgba(34, 197, 94, 0.35)",
        },
        sell: {
          DEFAULT: "#F0506E",
          text: "#F0506E",
          bg: "rgba(240, 80, 110, 0.14)",
          border: "rgba(240, 80, 110, 0.35)",
        },
        ward: {
          DEFAULT: "#F5B544",
          glow: "rgba(245, 181, 68, 0.4)",
        },
        warning: {
          DEFAULT: "#F5B544",
          bg: "rgba(245, 181, 68, 0.14)",
        },
        info: {
          DEFAULT: "#5AA9FF",
          bg: "rgba(90, 169, 255, 0.14)",
        },
        lime: {
          DEFAULT: "#D6F24A",
          glow: "rgba(214, 242, 74, 0.4)",
        },
      },
      borderRadius: {
        card: "24px",
        panel: "16px",
        tile: "12px",
        pill: "999px",
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '"Manrope"',
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"GeistMono"',
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        glass: "0 20px 50px -20px rgba(0, 0, 0, 0.8)",
        "glass-sm": "0 10px 30px -10px rgba(0, 0, 0, 0.6)",
        "glow-teal": "0 0 25px rgba(25, 203, 176, 0.35)",
        "glow-violet": "0 0 25px rgba(124, 92, 255, 0.35)",
        "glow-ward": "0 0 20px rgba(245, 181, 68, 0.4)",
      },
      keyframes: {
        wardShake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
        glowDrift1: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(3%, 2%) scale(1.05)" },
          "100%": { transform: "translate(-2%, -2%) scale(0.98)" },
        },
        glowDrift2: {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-3%, -2%) scale(1.04)" },
          "100%": { transform: "translate(2%, 3%) scale(0.97)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 8px rgba(245, 181, 68, 0.8))" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 3px rgba(245, 181, 68, 0.3))" },
        },
        pulseLive: {
          "0%": { transform: "scale(0.95)", opacity: "0.8" },
          "50%": { transform: "scale(1.3)", opacity: "0.2" },
          "100%": { transform: "scale(0.95)", opacity: "0.8" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "ward-shake": "wardShake 0.3s ease-in-out",
        "glow-drift-1": "glowDrift1 26s ease-in-out infinite alternate",
        "glow-drift-2": "glowDrift2 30s ease-in-out infinite alternate",
        "pulse-glow": "pulseGlow 2s infinite ease-in-out",
        "pulse-live": "pulseLive 2s infinite cubic-bezier(0.4, 0, 0.6, 1)",
        shimmer: "shimmer 2s infinite linear",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
