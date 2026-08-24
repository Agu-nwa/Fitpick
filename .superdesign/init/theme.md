# FitPick theme

## Compact token summary

- Canvas `#FAF7F0`, white surface `#FFFFFF`, warm panel `#F4EFE7`, ink/charcoal `#171514`, muted `#746E67`, line `#E8DED0`
- Production primary sage `#557C78`, sage hover `#456A66`, dark umber `#4A2E22`, optional pale gold `#D8B98C`, browser-theme black `#0A0A09`
- Success and info use sage, warning uses pale gold, and danger remains `#A4473E`; semantic colours are not decorative accents.
- UI font: native system sans. Editorial display: Georgia.
- Rounded surfaces: 1.25rem, 1.5rem, 2rem. Buttons use 1rem rounded corners.
- Cards use solid white, fine warm borders, and restrained umber shadows.
- Responsive breakpoints are Tailwind defaults. Mobile navigation and page padding include iOS safe-area variables.
- Motion is 200–220ms ease-out; reduced-motion disables animation and smooth scrolling.

## `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    colors: { canvas: "#FAF7F0", canvasSubtle: "#F4EFE7", surface: "#FFFFFF", surfaceWarm: "#F4EFE7", ink: "#171514", charcoal: "#171514", muted: "#746E67", line: "#E8DED0", primary: "#557C78", sage: "#557C78", sageDark: "#456A66", umber: "#4A2E22", gold: "#D8B98C", success: "#557C78", warning: "#D8B98C", danger: "#A4473E" },
    boxShadow: { soft: "0 8px 24px rgba(74, 46, 34, 0.06)", card: "0 12px 32px rgba(74, 46, 34, 0.075)", lift: "0 20px 48px rgba(74, 46, 34, 0.11)", inner: "inset 0 1px 0 rgba(255,255,255,0.72)", glow: "0 0 0 1px rgba(85,124,120,0.16), 0 10px 28px rgba(85,124,120,0.12)" },
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
  --font-editorial: "Bodoni Moda", Didot, "Bodoni 72", Georgia;
  --ease-premium: cubic-bezier(0.22, 1, 0.36, 1);
}
.focus-ring { @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa focus-visible:ring-offset-2 focus-visible:ring-offset-canvas; }
.premium-surface { border: 1px solid rgba(232,222,208,0.92); background: #FFFFFF; box-shadow: 0 1px 2px rgba(74,46,34,0.035); }
.glass-panel { border: 1px solid rgba(232,222,208,0.92); background: rgba(255,255,255,0.96); backdrop-filter: blur(14px); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
```
