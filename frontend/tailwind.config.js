/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: {
          50: "#f5f0eb",
          100: "#e8ddd2",
          200: "#d4c3b0",
          300: "#bca48e",
          400: "#a08570",
          500: "#856655",
          600: "#6b5044",
          700: "#533e36",
          800: "#3d2e29",
          900: "#2a1f1c",
          950: "#1a1210",
        },
        cream: "#faf7f2",
        parchment: "#f0ead8",
        sage: "#7a9e7e",
        rust: "#c4622d",
        slate: "#4a5568",
      },
    },
  },
  plugins: [],
};
