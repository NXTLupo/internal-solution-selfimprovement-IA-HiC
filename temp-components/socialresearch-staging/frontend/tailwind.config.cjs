// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundColor: {
        'black-80': 'rgba(34,38,43,0.8)',
        'bg-[rgba(34,38,43,255)]': 'rgba(34,38,43,0.6)',
        'black-60': 'rgba(34,38,43,0.6)',
        'black-40': 'rgba(34,38,43,0.4)',
        'light-background': '#4a5165',
        'dark-background': '#121b26',
      },
      colors: {
        'cyan-900': 'rgba(1,196,200,1)',
        'cyan-800': 'rgba(1,196,200,0.8)',
        'cyan-700': 'rgba(1,196,200,0.6)',
        'cyan-600': 'rgba(1,196,200,0.4)',
        'cyan-500': 'rgba(1,196,200,0.2)',
        'light-background': '#5a6275',
        'dark-background': '#121b26',
      },
    },
  },
  plugins: [],
}
