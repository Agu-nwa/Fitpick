"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { updateAvatarProfile, type AvatarProfileData } from "@/lib/api-client";

type AvatarProfile = AvatarProfileData["profile"];

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";

export function AvatarProfileForm({
  profile,
  onSaved
}: {
  profile: AvatarProfile;
  onSaved: (profile: AvatarProfile) => void;
}) {
  const [genderPresentation, setGenderPresentation] = useState<AvatarProfile["genderPresentation"]>(profile.genderPresentation);
  const [bodyPreset, setBodyPreset] = useState<AvatarProfile["bodyPreset"]>(profile.bodyPreset);
  const [heightPreset, setHeightPreset] = useState<AvatarProfile["heightPreset"]>(profile.heightPreset);
  const [posePreset, setPosePreset] = useState<AvatarProfile["posePreset"]>(profile.posePreset);
  const [visualizationStyle, setVisualizationStyle] = useState<AvatarProfile["visualizationStyle"]>(profile.visualizationStyle);
  const [avatarProvider, setAvatarProvider] = useState<AvatarProfile["avatarProvider"]>(profile.avatarProvider);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [skinTonePreset, setSkinTonePreset] = useState(profile.skinTonePreset || "");
  const [hairStylePreset, setHairStylePreset] = useState(profile.hairStylePreset || "");
  const [consentAccepted, setConsentAccepted] = useState(profile.consentAccepted);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setGenderPresentation(profile.genderPresentation);
    setBodyPreset(profile.bodyPreset);
    setHeightPreset(profile.heightPreset);
    setPosePreset(profile.posePreset);
    setVisualizationStyle(profile.visualizationStyle);
    setAvatarProvider(profile.avatarProvider);
    setAvatarUrl(profile.avatarUrl || "");
    setSkinTonePreset(profile.skinTonePreset || "");
    setHairStylePreset(profile.hairStylePreset || "");
    setConsentAccepted(profile.consentAccepted);
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    setNotice("");
    setError("");

    const result = await updateAvatarProfile({
      genderPresentation,
      bodyPreset,
      heightPreset,
      posePreset,
      visualizationStyle,
      avatarProvider,
      avatarUrl: avatarProvider === "fitpick_preset" ? null : avatarUrl || null,
      skinTonePreset: skinTonePreset || null,
      hairStylePreset: hairStylePreset || null,
      consentAccepted
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error.message || "Unable to save your Digital Human.");
      return;
    }

    onSaved(result.data.profile);
    setNotice("Digital Human saved.");
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Choose how FitPick visualizes your outfits.</p>
          <p className="mt-1 text-sm leading-6 text-muted">Your Digital Human helps FitPick generate premium outfit previews.</p>
        </div>
        <Badge tone="premium">User controlled</Badge>
      </div>

      {error ? <p className="rounded-2xl bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {notice ? <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-3 sm:grid-cols-2">
        <FieldGroup label="Gender presentation" htmlFor="avatar-gender">
          <select id="avatar-gender" className={inputClass} value={genderPresentation} onChange={(event) => setGenderPresentation(event.target.value as AvatarProfile["genderPresentation"])}>
            <option value="neutral">Neutral</option>
            <option value="masculine">Masculine</option>
            <option value="feminine">Feminine</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Body preset" htmlFor="avatar-body" help="Preset only, not a stored body measurement.">
          <select id="avatar-body" className={inputClass} value={bodyPreset} onChange={(event) => setBodyPreset(event.target.value as AvatarProfile["bodyPreset"])}>
            <option value="average">Average</option>
            <option value="slim">Slim</option>
            <option value="athletic">Athletic</option>
            <option value="curvy">Curvy</option>
            <option value="plus">Plus</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Height preset" htmlFor="avatar-height">
          <select id="avatar-height" className={inputClass} value={heightPreset || ""} onChange={(event) => setHeightPreset((event.target.value || null) as AvatarProfile["heightPreset"])}>
            <option value="">Unspecified</option>
            <option value="short">Short</option>
            <option value="average">Average</option>
            <option value="tall">Tall</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Pose" htmlFor="avatar-pose">
          <select id="avatar-pose" className={inputClass} value={posePreset} onChange={(event) => setPosePreset(event.target.value as AvatarProfile["posePreset"])}>
            <option value="standing">Standing</option>
            <option value="walking">Walking</option>
            <option value="editorial">Editorial</option>
            <option value="runway">Runway</option>
            <option value="casual">Casual</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Visualization style" htmlFor="avatar-style">
          <select id="avatar-style" className={inputClass} value={visualizationStyle} onChange={(event) => setVisualizationStyle(event.target.value as AvatarProfile["visualizationStyle"])}>
            <option value="luxury">Luxury</option>
            <option value="minimal">Minimal</option>
            <option value="streetwear">Streetwear</option>
            <option value="editorial">Editorial</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Avatar provider" htmlFor="avatar-provider">
          <select id="avatar-provider" className={inputClass} value={avatarProvider} onChange={(event) => setAvatarProvider(event.target.value as AvatarProfile["avatarProvider"])}>
            <option value="fitpick_preset">FitPick preset</option>
            <option value="ready_player_me">Ready Player Me</option>
            <option value="custom_glb">Custom GLB</option>
          </select>
        </FieldGroup>
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-white p-3">
        <FieldGroup label="Ready Player Me or GLB URL" htmlFor="avatar-url" help="Use a secure HTTPS .glb URL. FitPick does not execute scripts from avatar links.">
          <input
            id="avatar-url"
            className={inputClass}
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            disabled={avatarProvider === "fitpick_preset"}
            placeholder="https://models.readyplayer.me/avatar-id.glb"
          />
        </FieldGroup>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldGroup label="Skin tone preset" htmlFor="avatar-skin-tone">
            <input id="avatar-skin-tone" className={inputClass} value={skinTonePreset} onChange={(event) => setSkinTonePreset(event.target.value)} placeholder="warm medium" />
          </FieldGroup>
          <FieldGroup label="Hair style preset" htmlFor="avatar-hair">
            <input id="avatar-hair" className={inputClass} value={hairStylePreset} onChange={(event) => setHairStylePreset(event.target.value)} placeholder="short curls" />
          </FieldGroup>
        </div>
      </section>

      <label className="flex gap-3 rounded-2xl border border-cocoa/20 bg-cocoa/5 p-3 text-sm leading-6 text-ink">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-cocoa"
          checked={consentAccepted}
          onChange={(event) => setConsentAccepted(event.target.checked)}
        />
        <span>
          I understand this is an AI fashion visualization, not exact body-measurement virtual try-on.
        </span>
      </label>

      <Button type="button" className="w-full" onClick={() => void saveProfile()} disabled={saving}>
        {saving ? "Saving..." : "Save Digital Human"}
      </Button>
    </Card>
  );
}
