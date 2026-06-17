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
        canvas: "#F5F0E8",
        surface: "#FFFCF7",
        ink: "#171310",
        muted: "#7B7168",
        line: "#E6DED2",
        cocoa: "#5A3828",
        olive: "#6B7048",
        terracotta: "#A45E3B",
        success: "#6E8A66",
        warning: "#B88A42",
        danger: "#B35345"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(35, 24, 15, 0.08)",
        card: "0 10px 30px rgba(35, 24, 15, 0.06)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem",
        xl4: "2rem"
      }
    },
  },
  plugins: [],
};
export default config;
