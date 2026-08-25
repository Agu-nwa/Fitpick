"use client";

import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MarketingReveal({ children, className }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}

export function CinematicHeroMedia({ still, alt, animated = false }: { still: string; alt: string; animated?: boolean }) {
  const reduceMotion = useReducedMotion();
  const source = animated && !reduceMotion ? "/marketing/video/myfitpick-fashion-loop.webp" : still;
  const isBrandModelHero = still.includes("myfitpick-brand-models-hero");

  return (
    <div
      aria-label={alt}
      role="img"
      className={cn(
        "absolute inset-0 bg-cover bg-no-repeat",
        isBrandModelHero ? "bg-[66%_center]" : "bg-center"
      )}
      style={{ backgroundImage: `url(${source})` }}
    />
  );
}
