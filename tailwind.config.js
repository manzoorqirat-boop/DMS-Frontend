/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a1a24",
          900: "#0f2733",
          800: "#163344",
          700: "#1d3e4d",
        },
        surface: {
          DEFAULT: "#f7f9fa",
          raised: "#ffffff",
        },
        border: {
          DEFAULT: "#e2e8ed",
        },
        text: {
          primary: "#101820",
          secondary: "#55636e",
          tertiary: "#8b98a2",
        },
        brand: {
          DEFAULT: "#0e8074",
          hover: "#0b6a60",
          tint: "#e6f4f2",
        },
        danger: {
          DEFAULT: "#d64545",
          tint: "#fbe9e7",
        },
        // The lifecycle spectrum — the one signature color system used everywhere a document's
        // status is shown: the login rail, register status chips, filters, and later, charts.
        // Never introduce a status color outside this set; the whole point is that "amber"
        // always means the same lifecycle stage everywhere in the app.
        stage: {
          draft: "#7c6fe0",
          review: "#f0a83c",
          approved: "#12a594",
          effective: "#1fa971",
          superseded: "#5b7a9d",
          obsolete: "#d65f4c",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        drawline: {
          from: { transform: "scaleY(0)" },
          to: { transform: "scaleY(1)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        drawline: "drawline 1.1s cubic-bezier(.65,0,.35,1) 0.15s both",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};
