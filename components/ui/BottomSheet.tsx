"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function BottomSheet({
  open,
  title,
  children,
  onClose,
  className
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 mx-auto max-w-[430px] md:absolute" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            aria-label="Close sheet"
            className="absolute inset-0 bg-ink/20"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            initial={reduceMotion ? false : { y: "100%" }}
            animate={reduceMotion ? undefined : { y: 0 }}
            exit={reduceMotion ? undefined : { y: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn("absolute inset-x-0 bottom-0 max-h-[86svh] rounded-t-[2rem] border border-line bg-surface p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-soft", className)}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
              <button className="focus-ring min-h-11 rounded-full px-3 py-2 text-sm font-semibold text-muted" onClick={onClose}>Close</button>
            </div>
            {children}
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
