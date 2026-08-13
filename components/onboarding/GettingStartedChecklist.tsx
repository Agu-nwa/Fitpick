"use client";

import Link from "next/link";
import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { OnboardingState } from "@/types/onboarding";

export function GettingStartedChecklist({ initialState }: { initialState: OnboardingState }) {
  const [state, setState] = useState(initialState);
  const [dismissing, setDismissing] = useState(false);

  const progressPercent = useMemo(() => Math.round((state.completedCount / state.totalCount) * 100), [state.completedCount, state.totalCount]);

  async function dismissChecklist() {
    setDismissing(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss_checklist" })
      });
      if (response.ok) {
        const payload = await response.json() as { data?: { onboarding?: OnboardingState } };
        setState(payload.data?.onboarding || { ...state, shouldShowChecklist: false });
      }
    } finally {
      setDismissing(false);
    }
  }

  if (!state.shouldShowChecklist) return null;

  return (
    <section className="border-t border-line py-6" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cocoa">First steps</p>
          <h2 id="getting-started-title" className="mt-2 font-editorial text-3xl font-semibold leading-none text-ink">Getting Started</h2>
          <p className="mt-2 text-sm font-medium text-muted">
            {state.allComplete ? "Your first styling journey is complete." : `${state.completedCount} of ${state.totalCount} completed`}
          </p>
        </div>
        <button
          type="button"
          className="focus-ring flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-canvas/80 text-muted transition hover:text-ink"
          onClick={() => void dismissChecklist()}
          aria-label="Dismiss getting started checklist"
          disabled={dismissing}
        >
          {dismissing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
        </button>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-line/70" aria-hidden="true">
        <div className="h-full rounded-full bg-olive transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>

      {state.allComplete ? (
        <div className="mt-5 rounded-xl border border-success/25 bg-success/10 px-4 py-4 text-sm leading-6 text-ink">
          Beautiful. MyFitPick now has enough signal to style with more confidence.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {state.tasks.map((task) => (
          <Link
            key={task.id}
            href={task.href}
            className="focus-ring group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm font-semibold text-ink transition hover:border-olive/40 hover:bg-white"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${task.completed ? "border-olive bg-olive text-white" : "border-line bg-surface text-muted"}`}>
                {task.completed ? <Check size={15} aria-hidden="true" /> : null}
              </span>
              <span className="truncate">{task.title}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-cocoa" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
