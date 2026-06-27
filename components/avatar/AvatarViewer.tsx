"use client";

import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AvatarProfileData } from "@/lib/api-client";

const DynamicAvatarCanvas = dynamic(
  () => import("@/components/avatar/AvatarCanvas").then((module) => module.AvatarCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-line bg-canvas">
        <div className="h-16 w-16 animate-pulse rounded-full bg-line" />
      </div>
    )
  }
);

export function AvatarViewer({ profile }: { profile?: AvatarProfileData["profile"] | null }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Digital Human Preview</p>
          <p className="mt-1 text-xs leading-5 text-muted">AI fashion visualization, not exact body-measurement virtual try-on.</p>
        </div>
        <Badge tone={profile?.consentAccepted ? "premium" : "warning"}>
          {profile?.consentAccepted ? "Ready" : "Review"}
        </Badge>
      </div>

      <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-canvas">
        <DynamicAvatarCanvas
          avatarUrl={profile?.avatarUrl || null}
          bodyPreset={profile?.bodyPreset || "average"}
          visualizationStyle={profile?.visualizationStyle || "luxury"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">{profile?.avatarProvider === "ready_player_me" ? "Ready Player Me" : profile?.avatarProvider === "custom_glb" ? "Custom GLB" : "FitPick preset"}</Badge>
        <Badge tone="neutral">{profile?.posePreset || "standing"}</Badge>
        <Badge tone="neutral">{profile?.visualizationStyle || "luxury"}</Badge>
      </div>
    </Card>
  );
}
