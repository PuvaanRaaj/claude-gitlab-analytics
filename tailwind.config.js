/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        obs: {
          bg:       '#0C0F1A',
          surface:  '#141824',
          card:     '#1C2333',
          border:   '#2A3450',
          border2:  '#3A4D70',
          cyan:     '#00D4FF',
          'cyan-dim': '#00A3C4',
          amber:    '#F59E0B',
          'amber-dim': '#B45309',
          green:    '#22C55E',
          red:      '#EF4444',
          purple:   '#A78BFA',
          muted:    '#7C8DB5',
          text:     '#C8D6F0',
          'text-bright': '#F0F6FF',
        },
      },
      backgroundImage: {
        'grid-dark': `
          linear-gradient(rgba(42,52,80,0.35) 1px, transparent 1px),
          linear-gradient(90deg, rgba(42,52,80,0.35) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      boxShadow: {
        'cyan-glow': '0 0 24px rgba(0,212,255,0.2)',
        'amber-glow': '0 0 24px rgba(245,158,11,0.2)',
        'card': '0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(42,52,80,0.6)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
