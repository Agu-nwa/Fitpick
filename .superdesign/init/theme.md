# FitPick theme

## Compact token summary

- Canvas `#FAF7F0`, surface `#FFFFFF`, ink `#171514`, muted `#746E67`, line `#E8DED0`
- Brand teal/cocoa `#557C78`, olive/gold `#D8B98C`, terracotta `#E8B7AC`, espresso `#4A2E22`, lime accent `#D9FF66`
- Success `#557C78`, warning `#D8B98C`, danger `#B65B50`
- UI font: native system sans. Editorial display: Georgia.
- Rounded surfaces: 1.25rem, 1.5rem, 2rem. Buttons use 1rem rounded corners.
- Cards use translucent white, fine warm borders, blur, and restrained brown shadows.
- Responsive breakpoints are Tailwind defaults. Mobile navigation and page padding include iOS safe-area variables.
- Motion is 200–220ms ease-out; reduced-motion disables animation and smooth scrolling.

## `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: { canvas: "#FAF7F0", surface: "#FFFFFF", ink: "#171514", muted: "#746E67", line: "#E8DED0", cocoa: "#557C78", olive: "#D8B98C", terracotta: "#E8B7AC", espresso: "#4A2E22", lime: "#D9FF66", success: "#557C78", warning: "#D8B98C", danger: "#B65B50" },
    boxShadow: { soft: "0 24px 80px rgba(74, 46, 34, 0.095)", card: "0 16px 46px rgba(74, 46, 34, 0.09)", lift: "0 28px 80px rgba(74, 46, 34, 0.13)", inner: "inset 0 1px 0 rgba(255,255,255,0.72)", glow: "0 0 0 1px rgba(85, 124, 120, 0.16), 0 18px 50px rgba(85, 124, 120, 0.16)" },
    borderRadius: { xl2: "1.25rem", xl3: "1.5rem", xl4: "2rem" },
    fontFamily: { sans: ["var(--font-sans)", "sans-serif"], serif: ["var(--font-editorial)", "serif"] },
    letterSpacing: { editorial: "-0.02em" }
  } },
  plugins: []
};
export default config;
```

## Global variables and surfaces

```css
:root {
  color-scheme: light;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI";
  --font-editorial: Georgia;
  --ease-premium: cubic-bezier(0.22, 1, 0.36, 1);
}
.focus-ring { @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa focus-visible:ring-offset-2 focus-visible:ring-offset-canvas; }
.premium-surface { border: 1px solid rgba(232, 222, 208, 0.78); background: rgba(255, 255, 255, 0.82); box-shadow: 0 16px 46px rgba(74, 46, 34, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.72); backdrop-filter: blur(18px); }
.glass-panel { border: 1px solid rgba(232, 222, 208, 0.78); background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(22px); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
```
