# Shared UI primitives

Framework: Next.js 15 / React 18. Styling: Tailwind CSS with custom FitPick tokens.

## `components/ui/Button.tsx`

Primary interactive control with primary, secondary, ghost, and danger variants.

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant }>(function Button({
  children,
  className,
  variant = "primary",
  ...props
}, ref) {
  const styles = {
    primary: "bg-cocoa text-canvas shadow-glow hover:bg-cocoa/90 active:bg-espresso",
    secondary: "border border-line bg-white/85 text-ink shadow-card hover:border-cocoa/40 hover:bg-white",
    ghost: "text-ink hover:bg-white/75 hover:text-cocoa",
    danger: "bg-danger text-canvas hover:bg-danger/90"
  };

  return (
    <button
      ref={ref}
      className={cn(
        "focus-ring inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 whitespace-normal rounded-2xl px-5 py-3 text-center text-sm font-semibold leading-5 transition duration-200 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
```

## `components/ui/Card.tsx`

Translucent premium surface used throughout the product.

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("premium-surface premium-hover rounded-xl3 p-5", className)}>{children}</div>;
}
```

## `components/ui/Badge.tsx`

Compact semantic status badge.

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "premium" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-muted",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
  premium: "border-cocoa/25 bg-cocoa/10 text-cocoa",
  info: "border-olive/25 bg-olive/10 text-olive"
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none", tones[tone], className)}>
      <span className="truncate">{children}</span>
    </span>
  );
}
```

## `components/ui/ImageFrame.tsx`

Responsive image surface for wardrobe and generated imagery.

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ImageFrameAspect = "square" | "portrait" | "fullBody" | "wide";
type ImageFrameFit = "cover" | "contain";
const aspectClasses: Record<ImageFrameAspect, string> = { square: "aspect-square", portrait: "aspect-[4/5]", fullBody: "aspect-[3/4]", wide: "aspect-[16/10]" };
const fitClasses: Record<ImageFrameFit, string> = { cover: "object-cover", contain: "object-contain" };

export function ImageFrame({ src, alt, placeholder, overlay, aspect = "square", fit = "cover", className, imageClassName }: {
  src?: string | null; alt: string; placeholder?: ReactNode; overlay?: ReactNode; aspect?: ImageFrameAspect; fit?: ImageFrameFit; className?: string; imageClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink/10 via-surface to-olive/20", aspectClasses[aspect], className)}>
      {src ? <img src={src} alt={alt} className={cn("h-full w-full", fitClasses[fit], imageClassName)} loading="lazy" /> : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold leading-5 text-muted">{placeholder}</div>
      )}
      {overlay ? <div className="absolute inset-x-2 bottom-2">{overlay}</div> : null}
    </div>
  );
}
```
