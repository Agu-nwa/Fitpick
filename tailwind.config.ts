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
        canvas: "#FAF7F0",
        canvasSubtle: "#F4EFE7",
        surface: "#FFFFFF",
        surfaceWarm: "#FFFDF9",
        ink: "#171514",
        muted: "#746E67",
        line: "#E8DED0",
        cocoa: "#557C78",
        olive: "#D8B98C",
        terracotta: "#E8B7AC",
        espresso: "#4A2E22",
        lime: "#D9FF66",
        success: "#2F735F",
        warning: "#8A5A16",
        danger: "#A4473E",
        info: "#386A82"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(74, 46, 34, 0.06)",
        card: "0 12px 32px rgba(74, 46, 34, 0.075)",
        lift: "0 20px 48px rgba(74, 46, 34, 0.11)",
        inner: "inset 0 1px 0 rgba(255,255,255,0.72)",
        glow: "0 0 0 1px rgba(85, 124, 120, 0.14), 0 10px 28px rgba(85, 124, 120, 0.12)"
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
        editorial: "-0.02em"
      }
    },
  },
  plugins: [],
};
export default config;
