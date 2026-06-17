import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function CTABar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-[calc(86px+var(--safe-bottom))] z-20 rounded-xl3 border border-line bg-surface/95 p-3 shadow-soft backdrop-blur", className)}>
      {children}
    </div>
  );
}
