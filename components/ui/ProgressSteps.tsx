import { cn } from "@/lib/utils";

type ProgressStepStatus = "complete" | "current" | "pending" | "warning";

const statusClass: Record<ProgressStepStatus, string> = {
  complete: "border-success bg-success text-white",
  current: "border-cocoa bg-cocoa text-white",
  pending: "border-line bg-surface text-muted",
  warning: "border-warning bg-warning text-white"
};

export function ProgressSteps({
  steps,
  className
}: {
  steps: Array<{ label: string; status: ProgressStepStatus }>;
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-2 sm:grid-cols-3", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
              statusClass[step.status]
            )}
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <span className="min-w-0 truncate text-xs font-semibold text-ink">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
