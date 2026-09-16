/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':       '#FFFFFF',
        'bg-card':          '#FFFFFF',
        'bg-elevated':      '#F4F4F5',
        'accent-primary':   'rgb(var(--kc-primary) / <alpha-value>)',
        'accent-secondary': '#FF4D00',
        'text-primary':     '#18181B',
        'text-muted':       '#71717A',
        'border-color':     '#E4E4E7',
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
