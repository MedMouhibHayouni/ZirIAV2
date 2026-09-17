/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  // CRITICAL: Align Tailwind dark mode with data-theme attribute (not class)
  // This makes dark: utilities respond to [data-theme="dark"] on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ZirIA Brand Palette — aligned with CSS variables
        'zir-bg-primary':   '#0a1628',
        'zir-bg-secondary': '#0f1f35',
        'zir-bg-card':      '#0f1f35',
        'zir-emerald':      '#22c55e',
        'zir-green-deep':   '#1a7a4a',
        'zir-ocre':         '#c2832a',
      },
      fontFamily: {
        sans:    ['Inter', 'Tajawal', 'sans-serif'],
        arabic:  ['Tajawal', 'sans-serif'],
      },
      boxShadow: {
        'zir-sm':  '0 1px 3px rgba(0,0,0,0.07)',
        'zir-md':  '0 4px 12px rgba(0,0,0,0.10)',
        'zir-lg':  '0 10px 30px rgba(0,0,0,0.12)',
        'zir-glow': '0 0 20px rgba(34,197,94,0.25)',
      },
      borderRadius: {
        'zir-sm': '6px',
        'zir-md': '12px',
        'zir-lg': '20px',
        'zir-xl': '28px',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-in': 'slideIn 0.3s ease',
        'pulse-dot': 'pulseDot 2s infinite',
        'counter': 'counter 2s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(1.5)' },
        },
      },
    },
  },
  plugins: [],
};
