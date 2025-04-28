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
    },
    },
    plugins: [],
  }

