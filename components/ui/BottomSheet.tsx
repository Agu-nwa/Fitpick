"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

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
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusSheet = window.requestAnimationFrame(() => {
      const firstFocusable = sheetRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable || sheetRef.current)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) {
        event.preventDefault();
        sheetRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusSheet);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 mx-auto sm:max-w-[640px] md:absolute lg:max-w-none" role="dialog" aria-modal="true" aria-label={title}>
          <motion.button
            aria-label="Close sheet"
            className="absolute inset-0 bg-ink/20"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            ref={sheetRef}
            tabIndex={-1}
            initial={reduceMotion ? false : { y: "100%" }}
            animate={reduceMotion ? undefined : { y: 0 }}
            exit={reduceMotion ? undefined : { y: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn("absolute inset-x-0 bottom-0 flex max-h-[86svh] flex-col overflow-hidden rounded-t-[2rem] border border-line bg-surface p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-soft outline-none lg:left-1/2 lg:max-w-xl lg:-translate-x-1/2 lg:rounded-[2rem] lg:p-6", className)}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
              <button className="focus-ring min-h-11 rounded-full px-3 py-2 text-sm font-semibold text-muted" onClick={onClose}>Close</button>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
