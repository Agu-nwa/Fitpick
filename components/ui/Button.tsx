import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonVariant }>(function Button({
  children,
  className,
  variant = "primary",
  ...props
}, ref) {
  const styles = {
    primary: "bg-cocoa text-white shadow-soft hover:bg-sageDark active:bg-charcoal",
    secondary: "border border-line bg-surfaceWarm text-ink hover:border-cocoa/40 hover:bg-white",
    ghost: "text-ink hover:bg-canvasSubtle hover:text-cocoa",
    danger: "bg-danger text-canvas hover:bg-danger/90"
  };

  return (
    <button
      ref={ref}
      className={cn(
        "focus-ring inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 whitespace-normal rounded-xl px-5 py-3 text-center text-sm font-semibold leading-5 transition duration-200 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
