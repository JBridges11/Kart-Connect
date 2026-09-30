/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':       'var(--bg-primary)',
        'bg-card':          'var(--bg-card)',
        'bg-elevated':      'var(--bg-elevated)',
        'accent-primary':   'rgb(var(--kc-primary) / <alpha-value>)',
        'accent-secondary': '#FF4D00',
        'text-primary':     'var(--text-primary)',
        'text-muted':       'var(--text-muted)',
        'border-color':     'var(--border)',
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['Inter', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
      },
      borderRadius: {
        card: '6px',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
      },
    },
  },
}
