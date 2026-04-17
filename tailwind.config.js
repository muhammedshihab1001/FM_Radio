/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#050511',
        surface:    'rgba(255, 255, 255, 0.03)',
        'surface-high': 'rgba(255, 255, 255, 0.06)',
        accent: {
          DEFAULT: '#00f4ff',
          alt: '#f60b86',
          dim:  'rgba(0, 244, 255, 0.15)',
          glow: 'rgba(246, 11, 134, 0.15)',
        },
        primary: '#ffffff',
        muted:   'rgba(255, 255, 255, 0.5)',
        danger:  '#ff3b3b',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        cyan:    '0 0 24px rgba(0, 244, 255, 0.25), 0 0 48px rgba(0, 244, 255, 0.08)',
        magenta: '0 0 24px rgba(246, 11, 134, 0.25), 0 0 48px rgba(246, 11, 134, 0.08)',
        glass:   '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'card-in':    'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'modal-up':   'modalUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'slide-up':   'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        shimmer:      'shimmer 2s ease-in-out infinite',
        float:        'float 4s ease-in-out infinite',
        gradient:     'gradientShift 15s ease infinite alternate',
        'signal-bounce': 'signalBounce 0.8s ease-in-out infinite alternate',
        'wave-pulse':    'wavePulse 0.6s ease-in-out infinite alternate',
      },
      keyframes: {
        cardIn:    { '0%': { opacity:'0', transform:'translateY(16px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        modalUp:   { '0%': { opacity:'0', transform:'translateY(48px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        slideUp:   { '0%': { opacity:'0', transform:'translateY(100%)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        fadeIn:    { '0%': { opacity:'0' }, '100%': { opacity:'1' } },
        pulseGlow: { '0%,100%': { boxShadow:'0 0 15px rgba(0, 244, 255, 0.4)' }, '50%': { boxShadow:'0 0 35px rgba(246, 11, 134, 0.6)' } },
        shimmer:   { '0%': { transform:'translateX(-100%)' }, '100%': { transform:'translateX(100%)' } },
        float:     { '0%,100%': { transform:'translateY(0)' }, '50%': { transform:'translateY(-10px)' } },
        gradientShift: { '0%': { backgroundPosition: '0% 50%', backgroundSize: '150% 150%' }, '100%': { backgroundPosition: '100% 50%', backgroundSize: '150% 150%' } },
        signalBounce: { '0%': { transform: 'scaleY(0.4)', backgroundColor: '#00f4ff' }, '100%': { transform: 'scaleY(1)', backgroundColor: '#f60b86' } },
        wavePulse: { '0%': { transform: 'scaleY(0.4)', opacity: '0.3', backgroundColor: '#00f4ff' }, '100%': { transform: 'scaleY(1)', opacity: '1', backgroundColor: '#f60b86' } },
      },
    },
  },
  plugins: [
    function({ addBase, addUtilities }) {
      addBase({
        'html, body': {
          'overflow-x': 'hidden',
          'background-color': '#050511',
          'scroll-behavior': 'smooth',
          'touch-action': 'manipulation',
          '-webkit-tap-highlight-color': 'transparent',
        },
      });
      addUtilities({
        '.custom-scrollbar': {
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { 
            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
            borderRadius: '9999px',
            '&:hover': {
              backgroundColor: 'rgba(0, 244, 255, 0.25)',
            }
          },
        },
      });
    },
  ],
};
