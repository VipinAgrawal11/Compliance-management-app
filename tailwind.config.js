/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Professional accounting-firm palette: dark blue, white, gold accents.
        navy: {
          50: '#eef2f8',
          100: '#d4def0',
          200: '#a9bde0',
          300: '#7e9cd1',
          400: '#456499',
          500: '#1e3a66',
          600: '#173050',
          700: '#0f2747',
          800: '#0a1c34',
          900: '#061122',
        },
        gold: {
          50: '#fbf7ec',
          100: '#f4e9c8',
          200: '#ead38d',
          300: '#dfba52',
          400: '#c79a2b',
          500: '#b8860b',
          600: '#9a6f09',
          700: '#7c5707',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
