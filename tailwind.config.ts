import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A09",
        surface: "#141412",
        ink: "#F3F0E8",
        muted: "#9B978E",
        line: "#302F2B",
        cocoa: "#CAFF33",
        olive: "#D3B884",
        terracotta: "#D3B884",
        success: "#CAFF33",
        warning: "#D3B884",
        danger: "#EF6A5B"
      },
      boxShadow: {
        soft: "0 30px 90px rgba(0, 0, 0, 0.42)",
        card: "0 18px 50px rgba(0, 0, 0, 0.28)",
        glow: "0 0 0 1px rgba(202, 255, 51, 0.18), 0 18px 50px rgba(202, 255, 51, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem",
        xl4: "2rem"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        serif: ["var(--font-editorial)", "serif"]
      },
      letterSpacing: {
        editorial: "-0.035em"
      }
    },
  },
  plugins: [],
};
export default config;
