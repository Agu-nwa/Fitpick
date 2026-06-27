import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant }) {
  const styles = {
    primary: "bg-cocoa text-white shadow-card hover:bg-[#4a2e21] active:bg-[#43291e]",
    secondary: "border border-line bg-surface text-ink hover:border-cocoa/30 hover:bg-white",
    ghost: "text-cocoa hover:bg-cocoa/10",
    danger: "bg-danger text-white hover:bg-danger/90"
  };

  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 whitespace-normal rounded-2xl px-5 py-3 text-center text-sm font-semibold leading-5 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
