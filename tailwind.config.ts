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
        surface: "#FFFFFF",
        ink: "#171514",
        muted: "#746E67",
        line: "#E8DED0",
        cocoa: "#557C78",
        olive: "#D8B98C",
        terracotta: "#E8B7AC",
        espresso: "#4A2E22",
        lime: "#D9FF66",
        success: "#557C78",
        warning: "#D8B98C",
        danger: "#B65B50"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(74, 46, 34, 0.095)",
        card: "0 16px 46px rgba(74, 46, 34, 0.09)",
        lift: "0 28px 80px rgba(74, 46, 34, 0.13)",
        inner: "inset 0 1px 0 rgba(255,255,255,0.72)",
        glow: "0 0 0 1px rgba(85, 124, 120, 0.16), 0 18px 50px rgba(85, 124, 120, 0.16)"
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
