import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl3 border border-line bg-surface/90 p-5 shadow-card backdrop-blur-sm transition duration-300 hover:border-olive/30", className)}>{children}</div>;
}
