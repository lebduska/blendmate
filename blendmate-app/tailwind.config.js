export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blendmate: {
          orange: '#F57921', // Blender Orange
          blue: '#2478B1',   // Soulmate Blue
          dark: '#242424',   // Blender Dark
          gray: '#3D3D3D',
        }
      }
    },
  },
  plugins: [],
}
