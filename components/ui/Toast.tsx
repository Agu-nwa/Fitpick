"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Toast({ show, message, className }: { show: boolean; message: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn("fixed bottom-[calc(6.5rem+var(--safe-bottom))] left-1/2 z-50 w-[min(390px,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-ink px-4 py-3 text-center text-sm font-semibold text-white shadow-soft md:absolute", className)}
          aria-live="polite"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
