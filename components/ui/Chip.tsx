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
        "inline-flex min-h-9 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active ? "border-cocoa bg-cocoa text-white" : "border-line bg-surface text-muted",
        className
      )}
    >
      {children}
    </span>
  );
}
