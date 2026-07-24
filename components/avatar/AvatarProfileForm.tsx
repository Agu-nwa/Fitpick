"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Ruler, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { generateAvatarModelImage, requestSignedUploadUrl, updateAvatarProfile, uploadImageViaServer, type AvatarProfileData } from "@/lib/api-client";
import { imageUploadErrorMessage, normalizeImageForUpload } from "@/lib/image-upload/browser-normalize";
import { IMAGE_UPLOAD_POLICY } from "@/lib/image-upload-policy";
import { safeUploadErrorMessage, safeUserMessage } from "@/lib/user-facing-errors";

type AvatarProfile = AvatarProfileData["profile"];

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/80 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted disabled:opacity-60";

const measurementFields = [
  { key: "heightCm", label: "Height", placeholder: "178", min: 90, max: 240 },
  { key: "chestCm", label: "Chest", placeholder: "102", min: 45, max: 180 },
  { key: "bustCm", label: "Bust", placeholder: "96", min: 45, max: 180 },
  { key: "waistCm", label: "Waist", placeholder: "84", min: 40, max: 180 },
  { key: "hipsCm", label: "Hips", placeholder: "100", min: 45, max: 200 },
  { key: "shoulderWidthCm", label: "Shoulder width", placeholder: "46", min: 25, max: 80 },
  { key: "inseamCm", label: "Inseam", placeholder: "78", min: 35, max: 130 },
  { key: "armLengthCm", label: "Arm length", placeholder: "63", min: 30, max: 110 },
  { key: "weightKg", label: "Weight", placeholder: "78", min: 25, max: 260 },
  { key: "neckCm", label: "Neck", placeholder: "39", min: 20, max: 70 },
  { key: "thighCm", label: "Thigh", placeholder: "58", min: 25, max: 110 }
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

function hasMeasurementValues(measurements: Record<MeasurementKey, string>, shoeSize: string) {
  return Object.values(measurements).some((value) => value.trim()) || Boolean(shoeSize.trim());
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
  const [tryOnModelSource, setTryOnModelSource] = useState<AvatarProfile["tryOnModelSource"]>(profile.tryOnModelSource || "none");
  const [uploadedModelImageUrl, setUploadedModelImageUrl] = useState(profile.uploadedModelImageUrl || "");
  const [uploadedModelImageStorageKey, setUploadedModelImageStorageKey] = useState(profile.uploadedModelImageStorageKey || "");
  const [generatedModelImageUrl, setGeneratedModelImageUrl] = useState(profile.generatedModelImageUrl || "");
  const [generatedModelImageStorageKey, setGeneratedModelImageStorageKey] = useState(profile.generatedModelImageStorageKey || "");
  const [skinTonePreset, setSkinTonePreset] = useState(profile.skinTonePreset || "");
  const [hairStylePreset, setHairStylePreset] = useState(profile.hairStylePreset || "");
  const [measurements, setMeasurements] = useState<Record<MeasurementKey, string>>(measurementStateFromProfile(profile));
  const [shoeSize, setShoeSize] = useState(profile.shoeSize || "");
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
    setTryOnModelSource(profile.tryOnModelSource || "none");
    setUploadedModelImageUrl(profile.uploadedModelImageUrl || "");
    setUploadedModelImageStorageKey(profile.uploadedModelImageStorageKey || "");
    setGeneratedModelImageUrl(profile.generatedModelImageUrl || "");
    setGeneratedModelImageStorageKey(profile.generatedModelImageStorageKey || "");
    setSkinTonePreset(profile.skinTonePreset || "");
    setHairStylePreset(profile.hairStylePreset || "");
    setMeasurements(measurementStateFromProfile(profile));
    setShoeSize(profile.shoeSize || "");
    setBodyFitPreference(profile.bodyFitPreference || "regular");
    setConsentAccepted(profile.consentAccepted);
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    setNotice("");
    setError("");

    const hasSizeDetails = hasMeasurementValues(measurements, shoeSize);
    const result = await updateAvatarProfile({
      genderPresentation,
      bodyPreset,
      heightPreset,
      posePreset,
      visualizationStyle,
      tryOnModelSource,
      uploadedModelImageUrl: uploadedModelImageUrl || null,
      uploadedModelImageStorageKey: uploadedModelImageStorageKey || null,
      generatedModelImageUrl: generatedModelImageUrl || null,
      generatedModelImageStorageKey: generatedModelImageStorageKey || null,
      skinTonePreset: skinTonePreset || null,
      hairStylePreset: hairStylePreset || null,
      ...Object.fromEntries(measurementFields.map((field) => [field.key, numberOrNull(measurements[field.key] || "")])),
      shoeSize: shoeSize || null,
      bodyMeasurementSource: hasSizeDetails ? "manual" : "unknown",
      bodyMeasurementConfidence: hasSizeDetails ? Math.max(0.85, Number(profile.bodyMeasurementConfidence) || 0) : 0,
      bodyFitPreference,
      consentAccepted
    });

    setSaving(false);
    if (!result.ok) {
      setError(safeUserMessage(result.error, "Unable to save your appearance profile."));
      return;
    }

    onSaved(result.data.profile);
    setNotice("Appearance profile saved.");
  }

  async function handleModelPhoto(file: File) {
    setUploadingModel(true);
    setNotice("");
    setError("");

    try {
      const normalized = await normalizeImageForUpload(file, {
        source: "avatar_model",
        onStage: (stage) => {
          if (stage === "converting") setNotice("Converting your photo for upload...");
          if (stage === "generating-preview") setNotice("Preparing full-body photo...");
        }
      });

      const signed = await requestSignedUploadUrl({
        filename: normalized.file.name,
        mimeType: normalized.file.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType,
        sizeBytes: normalized.file.size,
        purpose: "avatar_model"
      });
      if (!signed.ok) {
        const fallback = await uploadImageViaServer({ file: normalized.file, purpose: "avatar_model" });
        if (!fallback.ok) throw new Error(safeUploadErrorMessage(signed.error, safeUploadErrorMessage(fallback.error, "Unable to upload your model photo.")));

        const result = await updateAvatarProfile({
          tryOnModelSource: "uploaded",
          uploadedModelImageUrl: fallback.data.upload.publicUrl,
          uploadedModelImageStorageKey: fallback.data.upload.storageKey,
          consentAccepted
        });
        if (!result.ok) throw new Error(safeUserMessage(result.error, "Unable to save your model photo."));

        URL.revokeObjectURL(normalized.previewUrl);
        onSaved(result.data.profile);
        setTryOnModelSource("uploaded");
        setUploadedModelImageUrl(result.data.profile.uploadedModelImageUrl || fallback.data.upload.publicUrl);
        setUploadedModelImageStorageKey(result.data.profile.uploadedModelImageStorageKey || fallback.data.upload.storageKey);
        setNotice("Model photo saved.");
        return;
      }
      const uploadAccess = signed.data.upload;
      if (!uploadAccess.ready || !uploadAccess.uploadUrl) {
        throw new Error(safeUploadErrorMessage(uploadAccess.message, "Unable to upload your model photo."));
      }

      const uploadResponse = await fetch(uploadAccess.uploadUrl, {
        method: uploadAccess.method || "PUT",
        headers: uploadAccess.headers || { "content-type": normalized.file.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType },
        body: normalized.file
      });
      if (!uploadResponse.ok) {
        const fallback = await uploadImageViaServer({ file: normalized.file, purpose: "avatar_model" });
        if (!fallback.ok) throw new Error("We could not upload your model photo.");

        const result = await updateAvatarProfile({
          tryOnModelSource: "uploaded",
          uploadedModelImageUrl: fallback.data.upload.publicUrl,
          uploadedModelImageStorageKey: fallback.data.upload.storageKey,
          consentAccepted
        });
        if (!result.ok) throw new Error(safeUserMessage(result.error, "Unable to save your model photo."));

        URL.revokeObjectURL(normalized.previewUrl);
        onSaved(result.data.profile);
        setTryOnModelSource("uploaded");
        setUploadedModelImageUrl(result.data.profile.uploadedModelImageUrl || fallback.data.upload.publicUrl);
        setUploadedModelImageStorageKey(result.data.profile.uploadedModelImageStorageKey || fallback.data.upload.storageKey);
        setNotice("Model photo saved.");
        return;
      }

      const imageUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl.split("?")[0] || "";
      const result = await updateAvatarProfile({
        tryOnModelSource: "uploaded",
        uploadedModelImageUrl: imageUrl,
        uploadedModelImageStorageKey: uploadAccess.storageKey,
        consentAccepted
      });
      if (!result.ok) throw new Error(safeUserMessage(result.error, "Unable to save your model photo."));

      onSaved(result.data.profile);
      setTryOnModelSource("uploaded");
      setUploadedModelImageUrl(result.data.profile.uploadedModelImageUrl || imageUrl);
      setUploadedModelImageStorageKey(result.data.profile.uploadedModelImageStorageKey || uploadAccess.storageKey);
      URL.revokeObjectURL(normalized.previewUrl);
      setNotice("Model photo saved.");
    } catch (uploadError) {
      setError(safeUploadErrorMessage(imageUploadErrorMessage(uploadError) || uploadError, "Unable to upload your model photo."));
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
      setError(safeUserMessage(result.error, "Unable to create your model image."));
      return;
    }

    onSaved(result.data.profile);
    setTryOnModelSource("generated");
    setGeneratedModelImageUrl(result.data.profile.generatedModelImageUrl || "");
    setGeneratedModelImageStorageKey(result.data.profile.generatedModelImageStorageKey || "");
    setNotice("Generated model image saved.");
  }

  const hasSizeDetails = hasMeasurementValues(measurements, shoeSize);
  const hasModelImage = Boolean(uploadedModelImageUrl || generatedModelImageUrl);

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <ScanFace size={14} aria-hidden="true" />
            Appearance
          </p>
          <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Set your model and fit.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">These details help MyFitPick create cleaner outfit previews and more practical fit guidance.</p>
        </div>
        <Badge tone="premium">User controlled</Badge>
      </div>

      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}

      <section className="grid grid-cols-1 gap-3 rounded-xl3 border border-line bg-canvas/50 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Model direction
          </p>
        </div>
        <FieldGroup label="Model base" htmlFor="avatar-gender" help="Choose the base MyFitPick should use for previews.">
          <select id="avatar-gender" className={inputClass} value={genderPresentation} onChange={(event) => setGenderPresentation(event.target.value as AvatarProfile["genderPresentation"])}>
            <option value="masculine">Male</option>
            <option value="feminine">Female</option>
            <option value="neutral">Not specified</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Body shape" htmlFor="avatar-body" help="A simple shape guide, not exact body measuring.">
          <select id="avatar-body" className={inputClass} value={bodyPreset} onChange={(event) => setBodyPreset(event.target.value as AvatarProfile["bodyPreset"])}>
            <option value="average">Average</option>
            <option value="slim">Slim</option>
            <option value="athletic">Athletic</option>
            <option value="curvy">Curvy</option>
            <option value="plus">Plus</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Height range" htmlFor="avatar-height">
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
        <FieldGroup label="Preview style" htmlFor="avatar-style">
          <select id="avatar-style" className={inputClass} value={visualizationStyle} onChange={(event) => setVisualizationStyle(event.target.value as AvatarProfile["visualizationStyle"])}>
            <option value="luxury">Luxury</option>
            <option value="minimal">Minimal</option>
            <option value="streetwear">Streetwear</option>
            <option value="editorial">Editorial</option>
          </select>
        </FieldGroup>
        <FieldGroup label="Skin tone" htmlFor="avatar-skin-tone" help="Optional. Used only to guide generated preview images.">
          <input id="avatar-skin-tone" className={inputClass} value={skinTonePreset} onChange={(event) => setSkinTonePreset(event.target.value)} placeholder="warm medium" />
        </FieldGroup>
        <FieldGroup label="Hair style" htmlFor="avatar-hair" help="Optional. Used only to guide generated preview images.">
          <input id="avatar-hair" className={inputClass} value={hairStylePreset} onChange={(event) => setHairStylePreset(event.target.value)} placeholder="short curls" />
        </FieldGroup>
      </section>

      <section className="space-y-4 rounded-xl3 border border-line bg-gradient-to-br from-canvas/70 via-canvas/50 to-olive/10 p-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Camera size={14} aria-hidden="true" />
            Try-on model image
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Upload an existing full-body photo or create a reusable MyFitPick model image. Your full body should be visible for better previews.
          </p>
        </div>
        <FieldGroup label="Preferred image" htmlFor="tryon-model-source">
          <select id="tryon-model-source" className={inputClass} value={tryOnModelSource} onChange={(event) => setTryOnModelSource(event.target.value as AvatarProfile["tryOnModelSource"])}>
            <option value="none">Use saved image automatically</option>
            <option value="uploaded">Prefer uploaded full-body photo</option>
            <option value="generated">Prefer generated MyFitPick model</option>
          </select>
        </FieldGroup>
        <input
          ref={modelFileInputRef}
          type="file"
          accept={IMAGE_UPLOAD_POLICY.acceptAttribute}
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
              Uploaded photo
            </p>
            {uploadedModelImageUrl ? <img src={uploadedModelImageUrl} alt="Uploaded full-body model" className="mt-3 aspect-[3/4] w-full rounded-xl object-cover" /> : <div className="mt-3 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-3 text-center text-xs font-semibold text-muted">No full-body photo yet</div>}
            <Button type="button" variant="secondary" className="mt-3 w-full" disabled={uploadingModel || saving} onClick={() => modelFileInputRef.current?.click()}>
              {uploadingModel ? "Uploading..." : "Upload full-body photo"}
            </Button>
          </div>
          <div className="rounded-2xl border border-line bg-surface/70 p-3">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              <Sparkles size={14} aria-hidden="true" />
              Generated model
            </p>
            {generatedModelImageUrl ? <img src={generatedModelImageUrl} alt="Generated MyFitPick model" className="mt-3 aspect-[3/4] w-full rounded-xl object-cover" /> : <div className="mt-3 flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-3 text-center text-xs font-semibold text-muted">No generated model yet</div>}
            <Button type="button" variant="secondary" className="mt-3 w-full" disabled={generatingModel || saving || !consentAccepted} onClick={() => void handleGenerateModelImage()}>
              {generatingModel ? "Creating..." : "Generate model image"}
            </Button>
          </div>
        </div>
        {!hasModelImage ? (
          <p className="rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs leading-5 text-ink">
            Add a full-body image before using virtual try-on for the best result.
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl3 border border-line bg-canvas/50 p-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Ruler size={14} aria-hidden="true" />
            Fit details
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">Optional measurements help preview proportions and fit notes. Leave unknown details blank.</p>
          {!hasSizeDetails ? (
            <p className="mt-2 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs leading-5 text-ink">
              Add size details when you have them to improve outfit previews.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {measurementFields.map((field) => (
            <FieldGroup key={field.key} label={`${field.label} (cm)`} htmlFor={`avatar-${field.key}`}>
              <input
                id={`avatar-${field.key}`}
                type="number"
                min={field.min}
                max={field.max}
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
          <FieldGroup label="Preferred fit" htmlFor="avatar-fit-preference">
            <select id="avatar-fit-preference" className={inputClass} value={bodyFitPreference} onChange={(event) => setBodyFitPreference(event.target.value as AvatarProfile["bodyFitPreference"])}>
              <option value="true_to_size">True to size</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="relaxed">Relaxed</option>
              <option value="oversized">Oversized</option>
            </select>
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
          <span className="inline-flex items-center gap-2 font-semibold">
            <ShieldCheck size={15} aria-hidden="true" />
            Preview consent
          </span>
          <span className="mt-1 block text-muted">
            I understand virtual try-on is a preview, not a perfect fitting.
          </span>
        </span>
      </label>

      <Button type="button" className="w-full rounded-full" onClick={() => void saveProfile()} disabled={saving}>
        {saving ? "Saving..." : "Save appearance"}
      </Button>
    </Card>
  );
}
