/** @type {import('tailwindcss').Config} */
module.exports = {
  // Make dark: utilities respond to the .dark class on <html> (not prefers-color-scheme)
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html}'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
};

