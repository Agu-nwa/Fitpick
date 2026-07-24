"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { AvatarProfileForm } from "@/components/avatar/AvatarProfileForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAvatarProfile, type AvatarProfileData } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";

export function AvatarStudioClient() {
  const session = useSession();
  const [profile, setProfile] = useState<AvatarProfileData["profile"] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");

  const loadProfile = useCallback(async () => {
    setStatus("loading");
    const result = await getAvatarProfile();
    if (result.ok) {
      setProfile(result.data.profile);
      setStatus("ready");
      return;
    }

    setProfile(null);
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadProfile();
  }, [loadProfile, session.status]);

  if (session.status === "loading" || status === "loading") return <LoadingState title="Loading appearance profile" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadProfile} />;
  }
  if (status === "error") {
    return <ApiErrorState title="Appearance profile unavailable" message="Unable to load your appearance profile right now." onRetry={loadProfile} />;
  }

  if (!profile) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-ink">Your appearance profile is ready to set up.</p>
        <p className="mt-2 text-sm leading-6 text-muted">Upload a full-body photo before using Virtual Try-On.</p>
        <Button type="button" className="mt-4 w-full" onClick={() => void loadProfile()}>
          Open appearance setup
        </Button>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <AvatarProfileForm profile={profile} onSaved={setProfile} />
    </div>
  );
}
