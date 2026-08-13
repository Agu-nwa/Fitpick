"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { StudioModelAppearanceWizard, defaultStudioModelAppearance } from "@/components/avatar/StudioModelAppearanceWizard";
import { Button } from "@/components/ui/Button";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { Card } from "@/components/ui/Card";
import { updateAvatarProfile, type AvatarProfileData } from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";
import type { StudioModelAppearance } from "@/lib/studio-model/appearance-taxonomy";

type AvatarProfile = AvatarProfileData["profile"];

function studioModelDisplayUrl(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = new URL(value, "https://www.myfitpick.com");
    if (parsed.pathname.startsWith("/models/studio/")) return parsed.pathname;
  } catch {
    // Preserve the supplied value so the image component can handle it.
  }
  return value;
}

function legacyAppearance(profile: AvatarProfile): StudioModelAppearance {
  return {
    ...defaultStudioModelAppearance,
    gender: profile.studioModelGender || (profile.genderPresentation === "masculine" ? "male" : "female"),
    bodyType: profile.studioModelType === "plus-size" ? "plus_size" : profile.studioModelType || "standard",
    heightBand: profile.heightPreset || undefined
  };
}

export function AvatarProfileForm({ profile, onSaved }: { profile: AvatarProfile; onSaved: (profile: AvatarProfile) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const studioModelImageUrl = studioModelDisplayUrl(profile.studioModelImageUrl);

  async function save(studioModelConfiguration: StudioModelAppearance) {
    setSaving(true); setNotice(""); setError("");
    const result = await updateAvatarProfile({ tryOnModelSource: "studio", studioModelConfiguration });
    setSaving(false);
    if (!result.ok) { setError(safeUserMessage(result.error, "We couldn’t save your appearance. Please try again.")); return; }
    onSaved(result.data.profile); setEditing(false);
    setNotice("Appearance saved. Future try-ons will use this Studio Model configuration.");
  }

  return <Card className="mx-auto max-w-3xl space-y-5">
    <div>
      <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa"><Camera size={14} aria-hidden="true" />Appearance</p>
      <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Your Studio Model</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Control body type, skin tone, and hair independently. These settings are used by Virtual Try-On, Create a Look, and Match an Outfit.</p>
    </div>
    {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
    {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}
    {!editing ? <section className="grid gap-4 rounded-xl3 border border-line bg-canvas/60 p-4 md:grid-cols-[0.8fr_1.2fr] md:items-center">
      <ImageFrame src={studioModelImageUrl} alt="Current Studio Model" aspect="fullBody" fit="cover" showRetry context="studio_model.current" imageClassName="object-top" placeholder="No model selected" className="border-line bg-surface" />
      <div><h3 className="text-lg font-bold text-ink">{profile.studioModelConfiguration ? "Personalized appearance saved" : "Legacy Studio Model"}</h3><p className="mt-2 text-sm leading-6 text-muted">{profile.studioModelExactAppearance ? "This preview exactly matches the saved configuration." : profile.studioModelWarning || "Customize this model with the expanded appearance controls."}</p><Button type="button" className="mt-4 w-full rounded-full" onClick={() => { setEditing(true); setError(""); setNotice(""); }}>Edit appearance</Button></div>
    </section> : <section className="rounded-xl3 border border-cocoa/20 bg-cocoa/5 p-4"><StudioModelAppearanceWizard initial={profile.studioModelConfiguration || legacyAppearance(profile)} saving={saving} onConfirm={save} onCancel={() => setEditing(false)} /></section>}
  </Card>;
}
