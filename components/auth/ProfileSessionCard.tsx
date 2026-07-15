"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ProfileSessionCard() {
  const { status, user, refresh } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogout() {
    setSigningOut(true);
    setMessage("");
    const result = await logout();
    setSigningOut(false);

    if (!result.ok) {
      setMessage("We could not sign you out. Try again soon.");
      return;
    }

    await refresh();
  }

  if (status === "loading") return <LoadingCard title="Checking account" />;
  if (status === "backend-unavailable") return <BackendUnavailableState onRetry={refresh} />;
  if (status === "logged-out") return <AuthRequiredState />;

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cocoa text-xl font-semibold text-canvas" aria-hidden>
          {user?.name?.slice(0, 1).toUpperCase() || "F"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-ink">{user?.name || "MyFitPick user"}</h2>
            <StatusBadge tone={user?.plan === "plus" ? "premium" : "neutral"}>{user?.plan || "free"}</StatusBadge>
          </div>
          <p className="mt-1 truncate text-sm text-muted">{user?.email}</p>
        </div>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-danger/10 px-3 py-2 text-xs text-danger">{message}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link href="/profile/preferences">
          <Button variant="secondary" className="w-full">Preferences</Button>
        </Link>
        <Button variant="danger" className="w-full" disabled={signingOut} onClick={handleLogout}>
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </Card>
  );
}
