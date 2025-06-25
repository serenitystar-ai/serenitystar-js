/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/lib/**/*.{svelte,js,ts,jsx,tsx}",
    "./src/App.svelte",
  ],
  plugins: [
    require("tailwindcss-animate"),
  ],
}
