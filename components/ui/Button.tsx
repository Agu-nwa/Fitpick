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
    primary: "bg-cocoa text-canvas shadow-glow hover:bg-cocoa/90 active:bg-espresso",
    secondary: "border border-line bg-white/80 text-ink shadow-card hover:border-olive/70 hover:bg-white",
    ghost: "text-ink hover:bg-white/70 hover:text-cocoa",
    danger: "bg-danger text-canvas hover:bg-danger/90"
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
