"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MarketingReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export function CinematicHeroMedia({ still, alt, animated = false }: { still: string; alt: string; animated?: boolean }) {
  const reduceMotion = useReducedMotion();
  const source = animated && !reduceMotion ? "/marketing/video/myfitpick-fashion-loop.webp" : still;
  const isBrandModelHero = still.includes("myfitpick-brand-models-hero");

  return (
    <motion.div
      aria-label={alt}
      role="img"
      initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute inset-0 bg-cover bg-no-repeat",
        isBrandModelHero ? "bg-[66%_center] sm:bg-center" : "bg-center"
      )}
      style={{ backgroundImage: `url(${source})` }}
    />
  );
}
