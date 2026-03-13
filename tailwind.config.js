/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      colors: {
        obs: {
          bg:       '#080B14',
          surface:  '#0F1420',
          card:     '#161D2E',
          border:   '#1E2A42',
          border2:  '#2A3A5C',
          cyan:     '#00C9FF',
          'cyan-dim': '#0099CC',
          amber:    '#F4A024',
          'amber-dim': '#B45309',
          green:    '#22C55E',
          red:      '#EF4444',
          purple:   '#A78BFA',
          muted:    '#5A6E94',
          text:     '#A8B8D4',
          'text-bright': '#E8EDF7',
        },
      },
      backgroundImage: {
        'grid-dark': `
          linear-gradient(rgba(30,42,66,0.35) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,42,66,0.35) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      boxShadow: {
        'cyan-glow': '0 0 24px rgba(0,201,255,0.2)',
        'amber-glow': '0 0 24px rgba(244,160,36,0.2)',
        'card': '0 2px 8px rgba(0,0,0,0.45), 0 0 0 1px rgba(30,42,66,0.6)',
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
