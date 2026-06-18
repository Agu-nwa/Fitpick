"use client";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { useBackendHealth } from "@/hooks/use-backend-health";

export function BackendHealthCard() {
  const { status, health, message, refresh } = useBackendHealth();

  if (status === "loading") return <LoadingCard title="Checking backend health" />;
  if (status === "unavailable") return <BackendUnavailableState onRetry={refresh} />;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Backend health</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {status === "reachable"
              ? "API is reachable and database setup is detected."
              : "API is reachable. Database environment setup is still needed for live data."}
          </p>
        </div>
        <StatusBadge tone={status === "reachable" ? "success" : "warning"}>
          {status === "reachable" ? "reachable" : "setup needed"}
        </StatusBadge>
      </div>
      <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 font-mono text-[11px] text-muted">
        {health?.service || "fitpick-api"} · {health?.status || message || "checking"}
      </p>
    </Card>
  );
}
