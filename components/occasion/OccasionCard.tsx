"use client";

import { motion } from "framer-motion";
import type { Occasion } from "@/types/occasion";
import { cn } from "@/lib/utils";

export function OccasionCard({ occasion, selected, onClick }: { occasion: Occasion; selected?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "focus-ring min-h-[112px] rounded-xl3 border p-4 text-left transition",
        selected ? "border-cocoa bg-cocoa text-canvas shadow-card" : "border-line bg-surface/80 text-ink hover:border-cocoa/40"
      )}
      aria-pressed={selected}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-full text-lg", selected ? "bg-canvas/15" : "bg-cocoa/10 text-cocoa")}>{occasion.icon}</span>
        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.18em]", selected ? "text-canvas/70" : "text-muted")}>{occasion.group}</span>
      </div>
      <h3 className="text-sm font-semibold">{occasion.name}</h3>
      <p className={cn("mt-1 line-clamp-2 text-xs leading-5", selected ? "text-canvas/75" : "text-muted")}>{occasion.description}</p>
    </motion.button>
  );
}
