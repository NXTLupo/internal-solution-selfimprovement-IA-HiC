/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nxt: {
          lime: '#caca20',
          teal: '#115054',
          orange: '#fd8e2e',
        }
      },
      fontFamily: {
        sans: ['Archivo', 'Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '4px',
        'lg': '4px',
      }
    }
  },
  plugins: [],
}
