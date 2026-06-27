import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldGroup({
  label,
  help,
  meta,
  htmlFor,
  required,
  children,
  className
}: {
  label: string;
  help?: string;
  meta?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("block text-xs font-semibold text-ink", className)}>
      <div className="mb-2 flex min-h-7 flex-wrap items-center justify-between gap-2">
        <label htmlFor={htmlFor} className={htmlFor ? "cursor-pointer" : undefined}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
        {meta}
      </div>
      {children}
      {help ? <p className="mt-2 text-[11px] font-medium leading-5 text-muted">{help}</p> : null}
    </div>
  );
}
