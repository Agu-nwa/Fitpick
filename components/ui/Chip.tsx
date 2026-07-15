import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  active,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition",
        active ? "border-cocoa bg-cocoa text-canvas shadow-glow" : "border-line bg-surface/80 text-muted hover:border-olive/50 hover:text-ink",
        className
      )}
    >
      {children}
    </span>
  );
}
