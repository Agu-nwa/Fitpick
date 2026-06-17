import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "success" | "warning" | "danger" | "premium" | "neutral";

export function StatusBadge({ children, tone = "neutral", className }: { children: ReactNode; tone?: StatusTone; className?: string }) {
  const tones = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    premium: "bg-cocoa/15 text-cocoa",
    neutral: "bg-canvas text-muted",
  };

  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[11px] font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}
