// tailwind.config.js — NXT 2026 Stark White Theme
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'Inter', 'sans-serif'],
      },
      backgroundColor: {
        'black-80': '#ffffff',
        'bg-[rgba(34,38,43,255)]': '#ffffff',
        'black-60': '#fafafa',
        'black-40': '#f5f5f5',
        'light-background': '#fafafa',
        'dark-background': '#ffffff',
      },
      colors: {
        'cyan-900': '#115054',
        'cyan-800': 'rgba(17,80,84,0.8)',
        'cyan-700': 'rgba(17,80,84,0.6)',
        'cyan-600': 'rgba(17,80,84,0.4)',
        'cyan-500': 'rgba(17,80,84,0.2)',
        'light-background': '#fafafa',
        'dark-background': '#ffffff',
        'nxt-teal': '#115054',
        'nxt-lime': '#caca20',
        'nxt-orange': '#fd8e2e',
      },
      borderColor: {
        DEFAULT: '#e5e5e5',
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '4px',
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
      },
    },
  },
  plugins: [],
}
