"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { AvatarProfileForm } from "@/components/avatar/AvatarProfileForm";
import { AvatarViewer } from "@/components/avatar/AvatarViewer";
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

  if (session.status === "loading" || status === "loading") return <LoadingState title="Loading your Digital Human" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadProfile} />;
  }
  if (status === "error") {
    return <ApiErrorState title="Digital Human unavailable" message="Unable to load your avatar studio right now." onRetry={loadProfile} />;
  }

  return (
    <div className="space-y-5">
      <AvatarViewer profile={profile} />
      {profile ? <AvatarProfileForm profile={profile} onSaved={setProfile} /> : null}
    </div>
  );
}
