"use client";

import { useEffect, useState } from "react";
import { Footprints, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { AvatarProfileData } from "@/lib/api-client";

type ViewerPosePreset = AvatarProfileData["profile"]["posePreset"];

function toneForStyle(style?: string) {
  if (style === "streetwear") return "bg-[#3b3f32]";
  if (style === "editorial") return "bg-[#5a3840]";
  if (style === "minimal") return "bg-[#8b806f]";
  return "bg-[#5a3828]";
}

function scaleForBody(bodyPreset?: string) {
  if (bodyPreset === "slim") return "scale-x-[0.88]";
  if (bodyPreset === "athletic") return "scale-x-[1.08]";
  if (bodyPreset === "curvy") return "scale-x-[1.12]";
  if (bodyPreset === "plus") return "scale-x-[1.18]";
  return "scale-x-100";
}

function poseClass(posePreset?: string) {
  if (posePreset === "side") return "rotate-3";
  if (posePreset === "back") return "rotate-180";
  if (posePreset === "walking" || posePreset === "runway") return "translate-y-1";
  return "";
}

function AvatarSilhouette({
  profile,
  posePreset,
  autoRotate,
  animatedPreview
}: {
  profile?: AvatarProfileData["profile"] | null;
  posePreset: ViewerPosePreset;
  autoRotate: boolean;
  animatedPreview: boolean;
}) {
  const styleTone = toneForStyle(profile?.visualizationStyle);

  return (
    <div className="relative flex aspect-square items-end justify-center overflow-hidden rounded-xl3 border border-line bg-gradient-to-br from-ink/10 via-surface to-olive/20 px-8 pb-9 pt-8">
      <div className="absolute left-8 top-8 size-28 rounded-full bg-cocoa/10 blur-3xl" />
      <div className="absolute bottom-8 right-8 size-32 rounded-full bg-olive/10 blur-3xl" />
      <div className="absolute inset-x-8 bottom-8 h-6 rounded-full bg-cocoa/10 blur-sm" />
      <div
        className={cn(
          "relative flex origin-bottom transition duration-500",
          scaleForBody(profile?.bodyPreset),
          poseClass(posePreset)
        )}
      >
        <div className={cn("relative flex flex-col items-center", autoRotate ? "avatar-turn" : "", animatedPreview ? "avatar-walk" : "")}>
          <div className="h-16 w-16 rounded-full bg-[#b99f87] shadow-card" />
          <div className={cn("mt-2 h-32 w-24 rounded-[2rem] shadow-card", styleTone)} />
          <div className="absolute top-20 flex w-48 justify-between">
            <div className={cn("h-24 w-6 rounded-full", styleTone, posePreset === "walking" || posePreset === "runway" ? "rotate-12" : "rotate-[18deg]")} />
            <div className={cn("h-24 w-6 rounded-full", styleTone, posePreset === "walking" || posePreset === "runway" ? "-rotate-12" : "-rotate-[18deg]")} />
          </div>
          <div className="mt-1 flex w-20 justify-between">
            <div className={cn("h-28 w-7 rounded-full bg-[#2a2824]", posePreset === "walking" || posePreset === "runway" ? "rotate-6" : "")} />
            <div className={cn("h-28 w-7 rounded-full bg-[#2a2824]", posePreset === "walking" || posePreset === "runway" ? "-rotate-6" : "")} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AvatarViewer({ profile }: { profile?: AvatarProfileData["profile"] | null }) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [animatedPreview, setAnimatedPreview] = useState(false);
  const [posePreset, setPosePreset] = useState(profile?.posePreset || "standing");

  useEffect(() => {
    setPosePreset(profile?.posePreset || "standing");
  }, [profile?.posePreset]);

  return (
    <Card className="sticky top-6 space-y-4 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Digital model
          </p>
          <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Studio preview</h2>
          <p className="mt-2 text-xs leading-5 text-muted">This is a preview, not a perfect fitting.</p>
        </div>
        <Badge tone={profile?.consentAccepted ? "premium" : "warning"}>
          {profile?.consentAccepted ? "Ready" : "Review"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Pose
          <select className="focus-ring mt-1 min-h-10 w-full rounded-2xl border border-line bg-canvas/80 px-3 text-xs text-ink" value={posePreset} onChange={(event) => setPosePreset(event.target.value as ViewerPosePreset)}>
            <option value="standing">Standing</option>
            <option value="runway">Runway</option>
            <option value="walking">Walking</option>
            <option value="side">Side</option>
            <option value="back">Back</option>
          </select>
        </label>
        <Button type="button" variant={autoRotate ? "primary" : "secondary"} className="self-end" onClick={() => setAutoRotate((value) => !value)}>
          <RotateCcw size={16} aria-hidden="true" />
          {autoRotate ? "Stand still" : "Turn around"}
        </Button>
        <Button type="button" variant={animatedPreview ? "primary" : "secondary"} className="self-end" onClick={() => setAnimatedPreview((value) => !value)}>
          <Footprints size={16} aria-hidden="true" />
          {animatedPreview ? "Stand still" : "Walk preview"}
        </Button>
      </div>

      <AvatarSilhouette profile={profile} posePreset={posePreset} autoRotate={autoRotate} animatedPreview={animatedPreview} />

      <details className="rounded-2xl border border-line bg-canvas/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Model details</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="neutral">{profile?.avatarProvider === "fitpick_preset" ? "MyFitPick model" : "Connected model"}</Badge>
          <Badge tone="neutral">{posePreset}</Badge>
          <Badge tone="neutral">{profile?.visualizationStyle || "luxury"}</Badge>
          {autoRotate ? <Badge tone="info">360 view</Badge> : null}
          {animatedPreview ? <Badge tone="warning">Walk preview mode</Badge> : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">Generated outfit previews use your saved model details.</p>
      </details>
    </Card>
  );
}
