"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Toast({ show, message, className }: { show: boolean; message: string; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {show ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+var(--safe-bottom))] z-50 flex justify-center px-4 lg:bottom-8" aria-live="polite">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn("pointer-events-auto w-full max-w-[390px] break-words rounded-full bg-ink px-4 py-3 text-center text-sm font-semibold leading-5 text-white shadow-soft", className)}
          >
            {message}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
