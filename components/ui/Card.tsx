import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("premium-surface rounded-2xl p-5", className)}>{children}</div>;
}

export function InteractiveCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("premium-surface premium-hover rounded-2xl p-5", className)}>{children}</div>;
}
