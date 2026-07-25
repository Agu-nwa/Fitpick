"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { OnboardingTipId } from "@/types/onboarding";

export function ContextualTip({
  tipId,
  dismissedTips,
  children
}: {
  tipId: OnboardingTipId;
  dismissedTips?: string[];
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(!dismissedTips?.includes(tipId));

  async function dismiss() {
    setVisible(false);
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_tip", tipId })
    }).catch(() => undefined);
  }

  if (!visible) return null;

  return (
    <aside className="flex items-start justify-between gap-4 rounded-3xl border border-olive/20 bg-olive/8 px-4 py-3 text-sm leading-6 text-ink shadow-soft" role="note">
      <p>{children}</p>
      <button
        type="button"
        className="focus-ring mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
        onClick={() => void dismiss()}
        aria-label="Dismiss tip"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </aside>
  );
}
