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

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
        tones[tone],
        className
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
