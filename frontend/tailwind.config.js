/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
            gilroy: ['Gilroy-Light', 'sans-serif'],
            gilroyBold: ['Gilroy-Bold', 'sans-serif'],
        },
        colors: {
          'gray-750': '#2d3748',
          'gray-850': '#1a202c',
          'purple': {
            950: '#3b0764',
          },
          'indigo': {
            950: '#1e1b4b',
          },
        },
        animation: {
          'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'float': 'float 6s ease-in-out infinite',
          'spin-slow': 'spin 8s linear infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-20px)' },
          }
        },
        blur: {
          '3xl': '64px',
          '4xl': '96px',
        },
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'casino-pattern': "url('/src/assets/images/casino-pattern.png')",
        },
        boxShadow: {
          'neon': '0 0 5px theme(colors.purple.400), 0 0 20px theme(colors.purple.600)',
          'neon-red': '0 0 5px theme(colors.red.400), 0 0 20px theme(colors.red.600)',
          'neon-gold': '0 0 5px theme(colors.yellow.300), 0 0 20px theme(colors.yellow.500)',
        },
        transitionDuration: {
          '2000': '2000ms',
          '3000': '3000ms',
        },
    },
    },
    plugins: [],
  }

