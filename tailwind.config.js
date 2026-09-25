/** @type {import('tailwindcss').Config} */

// Colours, radii, shadows and motion come from the CSS custom properties in
// src/styles/index.css. Tailwind only maps names onto them so alpha
// modifiers (bg-base/60, border-line/10, …) keep working.
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  // Plain `hover:`/`group-hover:` utilities only fire on devices that can
  // actually hover (wraps them in @media (hover: hover)), so a tap on touch
  // doesn't get stuck showing a "hover" state until a second tap.
  future: { hoverOnlyWhenSupported: true },
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
        tertiary: 'rgb(var(--c-text) / .5)',
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
        // Bridge names: still referenced by Header/MiniPlayer/Footer/CountryFilter/
        // StationModal/AdminPanel/App's Background+EmptyState (not yet redesigned —
        // Steps B/C). The Step A tailwind.config.js rewrite dropped these definitions
        // by accident, which silently killed the animation (Tailwind just emits no
        // CSS for an unknown animate-* name — no error, the element is just static).
        // Kept as exact v3 originals so those components render exactly as before.
        float: 'float 4s ease-in-out infinite',
        gradient: 'gradientShift 15s ease infinite alternate',
        'signal-bounce': 'signalBounce 0.8s ease-in-out infinite alternate',
        'wave-pulse': 'wavePulse 0.6s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        modalUp: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%', backgroundSize: '150% 150%' },
          '100%': { backgroundPosition: '100% 50%', backgroundSize: '150% 150%' },
        },
        signalBounce: {
          '0%': { transform: 'scaleY(0.4)', backgroundColor: '#00f4ff' },
          '100%': { transform: 'scaleY(1)', backgroundColor: '#f60b86' },
        },
        wavePulse: {
          '0%': { transform: 'scaleY(0.4)', opacity: '0.3', backgroundColor: '#00f4ff' },
          '100%': { transform: 'scaleY(1)', opacity: '1', backgroundColor: '#f60b86' },
        },
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
