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
          raised: "#10141C",
        },
        surface: {
          DEFAULT: "#0A0D13",
          elevated: "#0E1219",
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
          DEFAULT: "#F4F7FA",
          muted: "#98A4B4",
          dim: "#6D7888",
        },
        brand: {
          200: "#A8FFF2",
          300: "#6FF5E0",
          400: "#3EE6C8",
          500: "#19CBB0",
          600: "#0E9F8E",
          700: "#0A7A6E",
          glow: "rgba(25, 203, 176, 0.35)",
          subtle: "rgba(25, 203, 176, 0.12)",
        },
        violet: {
          300: "#C2B3FF",
          400: "#9B82FF",
          500: "#7C5CFF",
          600: "#6544E8",
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
          text: "#4ADE80",
          tint: "rgba(34, 197, 94, 0.12)",
          bg: "rgba(34, 197, 94, 0.14)",
          border: "rgba(34, 197, 94, 0.35)",
        },
        sell: {
          DEFAULT: "#F0506E",
          text: "#FB7185",
          tint: "rgba(240, 80, 110, 0.12)",
          bg: "rgba(240, 80, 110, 0.14)",
          border: "rgba(240, 80, 110, 0.35)",
        },
        trade: {
          buy: "#22C55E",
          sell: "#F0506E",
        },
        bg: {
          DEFAULT: "#04060A",
          2: "#080B10",
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
        8: "8px",
        10: "10px",
        12: "12px",
        14: "14px",
        16: "16px",
        18: "18px",
        20: "20px",
        22: "22px",
        24: "24px",
        28: "28px",
        card: "22px",
        panel: "16px",
        tile: "12px",
        pill: "999px",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          '"Plus Jakarta Sans"',
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          '"Sora"',
          '"Plus Jakarta Sans"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          '"JetBrains Mono"',
          '"GeistMono"',
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.08em" }],
      },
      boxShadow: {
        glass: "0 24px 60px -24px rgba(0, 0, 0, 0.85)",
        "glass-sm": "0 12px 32px -16px rgba(0, 0, 0, 0.65)",
        "glass-lg": "0 40px 90px -30px rgba(0, 0, 0, 0.9)",
        lift: "0 18px 40px -18px rgba(0, 0, 0, 0.75)",
        "glow-teal": "0 0 28px rgba(25, 203, 176, 0.35)",
        "glow-violet": "0 0 28px rgba(124, 92, 255, 0.35)",
        "glow-ward": "0 0 22px rgba(245, 181, 68, 0.4)",
        "inner-top": "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(25,203,176,0.16), transparent 70%)",
        "sheen":
          "linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.10) 45%, transparent 65%)",
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
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(-4%, 0) rotate(0deg)", opacity: "0.7" },
          "50%": { transform: "translate(4%, -3%) rotate(6deg)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "15%": { opacity: "0.6" },
          "85%": { opacity: "0.6" },
          "100%": { transform: "translateY(1000%)", opacity: "0" },
        },
        "ring-ping": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "count-flash": {
          "0%": { opacity: "0.4", transform: "translateY(-2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "ward-shake": "wardShake 0.3s ease-in-out",
        "glow-drift-1": "glowDrift1 26s ease-in-out infinite alternate",
        "glow-drift-2": "glowDrift2 30s ease-in-out infinite alternate",
        "pulse-glow": "pulseGlow 2s infinite ease-in-out",
        "pulse-live": "pulseLive 2s infinite cubic-bezier(0.4, 0, 0.6, 1)",
        shimmer: "shimmer 2s infinite linear",
        marquee: "marquee 36s linear infinite",
        "marquee-slow": "marquee 60s linear infinite",
        float: "float 6s ease-in-out infinite",
        breathe: "breathe 5s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "page-in": "page-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "gradient-pan": "gradient-pan 6s ease infinite",
        "scan-line": "scan-line 7s ease-in-out infinite",
        "ring-ping": "ring-ping 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "count-flash": "count-flash 0.35s ease-out",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
