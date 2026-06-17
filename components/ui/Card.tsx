import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl3 border border-line bg-surface p-5 shadow-card", className)}>{children}</div>;
}
