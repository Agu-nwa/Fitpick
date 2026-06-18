"use client";

import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSession } from "@/hooks/use-session";

export function AuthStatusCard() {
  const { status, user, refresh } = useSession();

  if (status === "loading") return <LoadingCard title="Checking session" />;
  if (status === "backend-unavailable") return <BackendUnavailableState onRetry={refresh} />;
  if (status === "logged-out") return <AuthRequiredState />;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Session check</p>
          <p className="mt-1 text-xs leading-5 text-muted">{user?.name || "FitPick user"} is authenticated.</p>
        </div>
        <StatusBadge tone="success">connected</StatusBadge>
      </div>
    </Card>
  );
}
