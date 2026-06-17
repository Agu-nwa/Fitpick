"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ToggleRow({ label, description, defaultOn = true }: { label: string; description: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((value) => !value)}
      className="focus-ring flex min-h-[72px] w-full items-center justify-between gap-4 rounded-xl3 border border-line bg-surface p-4 text-left shadow-card"
      aria-pressed={on}
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
      <span className={cn("flex h-7 w-12 items-center rounded-full p-1 transition", on ? "bg-cocoa" : "bg-line")} aria-hidden>
        <span className={cn("h-5 w-5 rounded-full bg-white transition", on ? "translate-x-5" : "translate-x-0")} />
      </span>
    </button>
  );
}
