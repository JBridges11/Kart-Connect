/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':       '#FFFFFF',
        'bg-card':          '#FFFFFF',
        'bg-elevated':      '#F4F4F5',
        'accent-primary':   '#CA8A04',
        'accent-secondary': '#FF4D00',
        'text-primary':     '#18181B',
        'text-muted':       '#71717A',
        'border-color':     '#E4E4E7',
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '6px',
      },
    },
  },
}
