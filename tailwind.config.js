/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{components,services,App,index}.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4f46e5',
          secondary: '#6366f1',
          dark: '#312e81',
          light: '#e0e7ff',
        },
      },
    },
  },
  plugins: [],
}
