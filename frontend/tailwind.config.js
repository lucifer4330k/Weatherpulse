/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand highlight: Editorial warm amber #E7B75A
        primary: {
          50: '#FDF8EC',
          100: '#FAF0D4',
          200: '#F5DE9E',
          300: '#EFCB68',
          400: '#EABF5B',
          500: '#E7B75A',
          600: '#D4A347',
          700: '#B08230',
          800: '#8A6321',
          900: '#644615',
          950: '#362409',
        },
        // Black-first precision surfaces
        surface: {
          base: '#090909',
          secondary: '#101010',
          elevated: '#171717',
          interactive: '#202020',
          border: '#2A2A2A',
          subtle: '#1F1F1F',
        },
        // Graphite dark palette
        dark: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#D4D4D4',
          300: '#A3A3A3',
          400: '#737373',
          500: '#404040',
          600: '#2A2A2A',
          700: '#202020',
          750: '#1C1C1C',
          800: '#171717',
          850: '#141414',
          900: '#101010',
          950: '#090909',
        },
        // Restrained meteorological spectrum
        weather: {
          cold: '#58A6FF',
          cool: '#4E878C',
          mild: '#4E9F8E',
          warm: '#E7B75A',
          hot: '#E07A5F',
          extreme: '#D9534F',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}