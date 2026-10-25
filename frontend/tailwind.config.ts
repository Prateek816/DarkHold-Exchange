import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'Manrope', 'sans-serif'],
        ui:      ['Manrope', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Mono', 'monospace'],
      },
      colors: {
        bg:       'var(--bg)',
        'bg-2':   'var(--bg-2)',
        'bg-3':   'var(--bg-3)',
        surface:  'var(--surface)',
        's2':     'var(--surface-2)',
        's3':     'var(--surface-3)',
        text:     'var(--text)',
        muted:    'var(--text-muted)',
        dim:      'var(--text-dim)',
        lav:      'var(--lavender)',
        'lav-d':  'var(--lavender-dim)',
        mint:     'var(--mint)',
        buy:      'var(--buy)',
        sell:     'var(--sell)',
        ceil:     'var(--ceiling)',
        sim:      'var(--sim)',
        warn:     'var(--warn)',
        border:   'rgba(255,255,255,0.08)',
        'border-s': 'rgba(255,255,255,0.14)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        lav:    '0 0 24px rgba(185,167,255,0.25)',
        mint:   '0 0 24px rgba(25,227,177,0.25)',
        buy:    '0 0 16px rgba(52,210,123,0.2)',
        sell:   '0 0 16px rgba(255,90,95,0.2)',
        card:   '0 2px 24px rgba(0,0,0,0.4)',
        deep:   '0 8px 48px rgba(0,0,0,0.6)',
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' },             to: { transform: 'none' } },
        shimmer:    { '0%,100%': { 'background-position': '-200% 0' }, '50%': { 'background-position': '200% 0' } },
        'pulse-ring': { '0%': { transform: 'scale(0.95)', 'box-shadow': '0 0 0 0 rgba(185,167,255,0.4)' }, '70%': { transform: 'scale(1)', 'box-shadow': '0 0 0 8px rgba(185,167,255,0)' }, '100%': { transform: 'scale(0.95)', 'box-shadow': '0 0 0 0 rgba(185,167,255,0)' } },
      },
      animation: {
        'fade-in':   'fade-in 0.3s ease both',
        'slide-in':  'slide-in 0.25s ease both',
        shimmer:     'shimmer 1.5s infinite linear',
        'pulse-ring':'pulse-ring 2s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
