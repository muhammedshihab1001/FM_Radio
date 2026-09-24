/** @type {import('tailwindcss').Config} */

// Colours, radii, shadows and motion come from the CSS custom properties in
// src/styles/index.css. Tailwind only maps names onto them so alpha
// modifiers (bg-base/60, border-line/10, …) keep working.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: c('bg-base'),
        surface: c('bg-surface'),
        raised: c('bg-raised'),
        overlay: c('bg-overlay'),
        line: c('border'),
        cyan: {
          DEFAULT: c('cyan'),
          dim: 'rgb(var(--c-cyan) / .15)',
        },
        magenta: {
          DEFAULT: c('magenta'),
          dim: 'rgb(var(--c-magenta) / .15)',
        },
        danger: c('danger'),
        warn: c('warn'),
        // Text tiers, exactly as specced: primary/secondary/tertiary.
        primary: c('text'),
        secondary: 'rgb(var(--c-text) / .64)',
        tertiary: 'rgb(var(--c-text) / .4)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['12px', { lineHeight: '16px' }],
        xs: ['13px', { lineHeight: '18px' }],
        sm: ['15px', { lineHeight: '22px' }],
        base: ['17px', { lineHeight: '26px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['28px', { lineHeight: '34px' }],
        '2xl': ['40px', { lineHeight: '46px' }],
      },
      borderRadius: {
        card: 'var(--r-card)',
        button: 'var(--r-button)',
        chip: 'var(--r-chip)',
        modal: 'var(--r-modal)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        glow: 'var(--shadow-glow-cyan)',
      },
      transitionDuration: {
        micro: 'var(--dur-micro)',
        standard: 'var(--dur-standard)',
        entrance: 'var(--dur-entrance)',
      },
      transitionTimingFunction: {
        premium: 'var(--ease-premium)',
      },
      spacing: {
        header: 'var(--h-header)',
        player: 'var(--h-player)',
        footer: 'var(--h-footer)',
      },
      animation: {
        'fade-in': 'fadeIn var(--dur-standard) var(--ease-premium)',
        'modal-up': 'modalUp var(--dur-entrance) var(--ease-premium)',
        'slide-up': 'slideUp var(--dur-entrance) var(--ease-premium)',
        'pulse-dot': 'pulse-dot 1.2s var(--ease-premium) infinite',
        'glow-breathe': 'glow-breathe 2.4s var(--ease-premium) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        modalUp: { '0%': { opacity: '0', transform: 'translateY(24px) scale(.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(100%)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        'html, body': {
          'overflow-x': 'hidden',
          'touch-action': 'manipulation',
          '-webkit-tap-highlight-color': 'transparent',
        },
      });
    },
  ],
};
