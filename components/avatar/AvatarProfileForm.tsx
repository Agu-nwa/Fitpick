"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Ruler, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { generateAvatarModelImage, requestSignedUploadUrl, updateAvatarProfile, type AvatarProfileData } from "@/lib/api-client";

type AvatarProfile = AvatarProfileData["profile"];

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/80 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted disabled:opacity-60";

const measurementFields = [
  { key: "heightCm", label: "Height", placeholder: "178" },
  { key: "weightKg", label: "Weight", placeholder: "78" },
  { key: "chestCm", label: "Chest", placeholder: "102" },
  { key: "bustCm", label: "Bust", placeholder: "96" },
  { key: "waistCm", label: "Waist", placeholder: "84" },
  { key: "hipsCm", label: "Hips", placeholder: "100" },
  { key: "shoulderWidthCm", label: "Shoulder width", placeholder: "46" },
  { key: "inseamCm", label: "Inseam", placeholder: "78" },
  { key: "armLengthCm", label: "Arm length", placeholder: "63" },
  { key: "neckCm", label: "Neck", placeholder: "39" },
  { key: "thighCm", label: "Thigh", placeholder: "58" }
] as const;

type MeasurementKey = typeof measurementFields[number]["key"];

function numberOrNull(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 10) / 10 : null;
}

function measurementStateFromProfile(profile: AvatarProfile) {
  return Object.fromEntries(
    measurementFields.map((field) => [field.key, profile[field.key] === null || profile[field.key] === undefined ? "" : String(profile[field.key])])
  ) as Record<MeasurementKey, string>;
}

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
  const [tryOnModelSource, setTryOnModelSource] = useState<AvatarProfile["tryOnModelSource"]>(profile.tryOnModelSource || "none");
  const [uploadedModelImageUrl, setUploadedModelImageUrl] = useState(profile.uploadedModelImageUrl || "");
  const [uploadedModelImageStorageKey, setUploadedModelImageStorageKey] = useState(profile.uploadedModelImageStorageKey || "");
  const [generatedModelImageUrl, setGeneratedModelImageUrl] = useState(profile.generatedModelImageUrl || "");
  const [generatedModelImageStorageKey, setGeneratedModelImageStorageKey] = useState(profile.generatedModelImageStorageKey || "");
  const [skinTonePreset, setSkinTonePreset] = useState(profile.skinTonePreset || "");
  const [hairStylePreset, setHairStylePreset] = useState(profile.hairStylePreset || "");
  const [measurements, setMeasurements] = useState<Record<MeasurementKey, string>>(measurementStateFromProfile(profile));
  const [shoeSize, setShoeSize] = useState(profile.shoeSize || "");
  const [bodyMeasurementSource, setBodyMeasurementSource] = useState(profile.bodyMeasurementSource || "unknown");
  const [bodyMeasurementConfidence, setBodyMeasurementConfidence] = useState(String(profile.bodyMeasurementConfidence ?? 0));
  const [bodyFitPreference, setBodyFitPreference] = useState(profile.bodyFitPreference || "regular");
  const [consentAccepted, setConsentAccepted] = useState(profile.consentAccepted);
  const [saving, setSaving] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [generatingModel, setGeneratingModel] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGenderPresentation(profile.genderPresentation);
    setBodyPreset(profile.bodyPreset);
    setHeightPreset(profile.heightPreset);
    setPosePreset(profile.posePreset);
    setVisualizationStyle(profile.visualizationStyle);
    setAvatarProvider(profile.avatarProvider);
    setAvatarUrl(profile.avatarUrl || "");
    setTryOnModelSource(profile.tryOnModelSource || "none");
    setUploadedModelImageUrl(profile.uploadedModelImageUrl || "");
    setUploadedModelImageStorageKey(profile.uploadedModelImageStorageKey || "");
    setGeneratedModelImageUrl(profile.generatedModelImageUrl || "");
    setGeneratedModelImageStorageKey(profile.generatedModelImageStorageKey || "");
    setSkinTonePreset(profile.skinTonePreset || "");
    setHairStylePreset(profile.hairStylePreset || "");
    setMeasurements(measurementStateFromProfile(profile));
    setShoeSize(profile.shoeSize || "");
    setBodyMeasurementSource(profile.bodyMeasurementSource || "unknown");
    setBodyMeasurementConfidence(String(profile.bodyMeasurementConfidence ?? 0));
    setBodyFitPreference(profile.bodyFitPreference || "regular");
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
      tryOnModelSource,
      uploadedModelImageUrl: uploadedModelImageUrl || null,
      uploadedModelImageStorageKey: uploadedModelImageStorageKey || null,
      generatedModelImageUrl: generatedModelImageUrl || null,
      generatedModelImageStorageKey: generatedModelImageStorageKey || null,
      skinTonePreset: skinTonePreset || null,
      hairStylePreset: hairStylePreset || null,
      ...Object.fromEntries(measurementFields.map((field) => [field.key, numberOrNull(measurements[field.key] || "")])),
      shoeSize: shoeSize || null,
      bodyMeasurementSource,
      bodyMeasurementConfidence: Math.max(0, Math.min(1, Number(bodyMeasurementConfidence) || 0)),
      bodyFitPreference,
      consentAccepted
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error.message || "Unable to save your avatar.");
      return;
    }

    onSaved(result.data.profile);
    setNotice("Avatar saved.");
  }

  async function handleModelPhoto(file: File) {
    setUploadingModel(true);
    setNotice("");
    setError("");

    try {
      const signed = await requestSignedUploadUrl({
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        sizeBytes: file.size,
        purpose: "avatar_model"
      });
      if (!signed.ok) throw new Error(signed.error.message);
      const uploadAccess = signed.data.upload;
      if (!uploadAccess.ready || !uploadAccess.uploadUrl) {
        throw new Error(uploadAccess.message || "Image upload is not configured yet.");
      }

      const uploadResponse = await fetch(uploadAccess.uploadUrl, {
        method: uploadAccess.method || "PUT",
        headers: uploadAccess.headers || { "content-type": file.type || "image/jpeg" },
        body: file
      });
      if (!uploadResponse.ok) throw new Error("We could not upload your model photo.");

      const imageUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl.split("?")[0] || "";
      const result = await updateAvatarProfile({
        tryOnModelSource: "uploaded",
        uploadedModelImageUrl: imageUrl,
        uploadedModelImageStorageKey: uploadAccess.storageKey,
        consentAccepted
      });
      if (!result.ok) throw new Error(result.error.message || "Unable to save your model photo.");

      onSaved(result.data.profile);
      setTryOnModelSource("uploaded");
      setUploadedModelImageUrl(result.data.profile.uploadedModelImageUrl || imageUrl);
      setUploadedModelImageStorageKey(result.data.profile.uploadedModelImageStorageKey || uploadAccess.storageKey);
      setNotice("Model photo saved.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload your model photo.");
    } finally {
      setUploadingModel(false);
    }
  }

  async function handleGenerateModelImage() {
    setGeneratingModel(true);
    setNotice("");
    setError("");

    const result = await generateAvatarModelImage();
    setGeneratingModel(false);
    if (!result.ok) {
      setError(result.error.message || "Unable to create your model image.");
      return;
    }

    onSaved(result.data.profile);
    setTryOnModelSource("generated");
    setGeneratedModelImageUrl(result.data.profile.generatedModelImageUrl || "");
    setGeneratedModelImageStorageKey(result.data.profile.generatedModelImageStorageKey || "");
    setNotice("Generated model image saved.");
  }

  const hasSizeDetails = Object.values(measurements).some((value) => value.trim()) || Boolean(shoeSize.trim());

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <ScanFace size={14} aria-hidden="true" />
            Model controls
          </p>
          <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Set your fitting profile.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Adding your size helps MyFitPick show outfits better. You can skip this and add it later.</p>
        </div>
        <Badge tone="premium">User controlled</Badge>
      </div>

      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}

      <section className="grid grid-cols-1 gap-3 rounded-xl3 border border-line bg-canvas/50 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Avatar direction
          </p>
        </div>
        <FieldGroup label="Avatar base" htmlFor="avatar-gender" help="Choose the avatar base MyFitPick should use for previews.">
          <select id="avatar-gender" className={inputClass} value={genderPresentation} onChange={(event) => setGenderPresentation(event.target.value as AvatarProfile["genderPresentation"])}>
            <option value="masculine">Male</option>
            <option value="feminine">Female</option>
            <option value="neutral">Not specified</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Body shape" htmlFor="avatar-body" help="A simple avatar shape, not exact body measuring.">
          <select id="avatar-body" className={inputClass} value={bodyPreset} onChange={(event) => setBodyPreset(event.target.value as AvatarProfile["bodyPreset"])}>
            <option value="average">Average</option>
            <option value="slim">Slim</option>
            <option value="athletic">Athletic</option>
            <option value="curvy">Curvy</option>
            <option value="plus">Plus</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Height" htmlFor="avatar-height">
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
            <option value="side">Side</option>
            <option value="back">Back</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Avatar style" htmlFor="avatar-style">
          <select id="avatar-style" className={inputClass} value={visualizationStyle} onChange={(event) => setVisualizationStyle(event.target.value as AvatarProfile["visualizationStyle"])}>
            <option value="luxury">Luxury</option>
            <option value="minimal">Minimal</option>
            <option value="streetwear">Streetwear</option>
            <option value="editorial">Editorial</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Avatar type" htmlFor="avatar-provider">
          <select id="avatar-provider" className={inputClass} value={avatarProvider} onChange={(event) => setAvatarProvider(event.target.value as AvatarProfile["avatarProvider"])}>
            <option value="fitpick_preset">MyFitPick preset</option>
            <option value="ready_player_me">Ready Player Me</option>
            <option value="custom_glb">Custom GLB</option>
          </select>
        </FieldGroup>
      </section>

      <section className="space-y-3 rounded-xl3 border border-line bg-canvas/50 p-4">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
          <ShieldCheck size={14} aria-hidden="true" />
          Advanced source
        </p>
        <FieldGroup label="Custom avatar link" htmlFor="avatar-url" help="Optional. Use this only if you already have a secure avatar file link.">
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

      <section className="space-y-4 rounded-xl3 border border-line bg-gradient-to-br from-canvas/70 via-canvas/50 to-olive/10 p-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Camera size={14} aria-hidden="true" />
            Virtual try-on model image
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">Use a full-body photo for the most grounded try-on, or generate a stable MyFitPick model image and reuse it.</p>
        </div>
        <FieldGroup label="Model image source" htmlFor="tryon-model-source">
          <select id="tryon-model-source" className={inputClass} value={tryOnModelSource} onChange={(event) => setTryOnModelSource(event.target.value as AvatarProfile["tryOnModelSource"])}>
            <option value="none">No model image</option>
            <option value="uploaded">Uploaded full-body photo</option>
            <option value="generated">Generated MyFitPick model</option>
          </select>
        </FieldGroup>
        <input
          ref={modelFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) void handleModelPhoto(file);
          }}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface/70 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              <ImagePlus size={14} aria-hidden="true" />
              Uploaded
            </p>
            {uploadedModelImageUrl ? <img src={uploadedModelImageUrl} alt="" className="mt-3 aspect-[3/4] w-full rounded-xl object-cover" /> : <div className="mt-3 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-3 text-center text-xs font-semibold text-muted">No full-body photo yet</div>}
            <Button type="button" variant="secondary" className="mt-3 w-full" disabled={uploadingModel || saving} onClick={() => modelFileInputRef.current?.click()}>
              {uploadingModel ? "Uploading..." : "Upload full-body photo"}
            </Button>
          </div>
          <div className="rounded-2xl border border-line bg-surface/70 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              <Sparkles size={14} aria-hidden="true" />
              Generated
            </p>
            {generatedModelImageUrl ? <img src={generatedModelImageUrl} alt="" className="mt-3 aspect-[3/4] w-full rounded-xl object-cover" /> : <div className="mt-3 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-3 text-center text-xs font-semibold text-muted">No generated model yet</div>}
            <Button type="button" variant="secondary" className="mt-3 w-full" disabled={generatingModel || saving || !consentAccepted} onClick={() => void handleGenerateModelImage()}>
              {generatingModel ? "Creating..." : "Generate model image"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl3 border border-line bg-canvas/50 p-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Ruler size={14} aria-hidden="true" />
            My size
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">Adding your size helps MyFitPick show outfits better. These details are not used to infer identity.</p>
          {!hasSizeDetails ? (
            <p className="mt-2 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs leading-5 text-ink">
              No size details yet. Add your size later to improve outfit previews.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {measurementFields.map((field) => (
            <FieldGroup key={field.key} label={`${field.label} (cm)`} htmlFor={`avatar-${field.key}`}>
              <input
                id={`avatar-${field.key}`}
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={measurements[field.key] || ""}
                onChange={(event) => setMeasurements((current) => ({ ...current, [field.key]: event.target.value }))}
                placeholder={field.placeholder}
              />
            </FieldGroup>
          ))}
          <FieldGroup label="Shoe size" htmlFor="avatar-shoe-size">
            <input id="avatar-shoe-size" className={inputClass} value={shoeSize} onChange={(event) => setShoeSize(event.target.value)} placeholder="EU 43 / US 10" />
          </FieldGroup>
          <FieldGroup label="How I like clothes to fit" htmlFor="avatar-fit-preference">
            <select id="avatar-fit-preference" className={inputClass} value={bodyFitPreference} onChange={(event) => setBodyFitPreference(event.target.value as AvatarProfile["bodyFitPreference"])}>
              <option value="true_to_size">True to size</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
          </FieldGroup>
          <FieldGroup label="How size was added" htmlFor="avatar-measurement-source">
            <select id="avatar-measurement-source" className={inputClass} value={bodyMeasurementSource} onChange={(event) => setBodyMeasurementSource(event.target.value as AvatarProfile["bodyMeasurementSource"])}>
              <option value="unknown">Unknown</option>
              <option value="manual">Manual</option>
              <option value="estimated">Estimated</option>
              <option value="body_scan">Body scan</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Size accuracy" htmlFor="avatar-measurement-confidence" help="Use a lower number when this is only a guess.">
            <input id="avatar-measurement-confidence" type="number" min="0" max="1" step="0.05" className={inputClass} value={bodyMeasurementConfidence} onChange={(event) => setBodyMeasurementConfidence(event.target.value)} />
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
          I understand this is a preview, not a perfect fitting.
        </span>
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" className="w-full" onClick={() => void saveProfile()} disabled={saving}>
          {saving ? "Saving..." : "Save my size"}
        </Button>
        <Link href="/home">
          <Button type="button" variant="secondary" className="w-full" disabled={saving}>Skip for now</Button>
        </Link>
      </div>
    </Card>
  );
}
