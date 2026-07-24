"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requestSignedUploadUrl, updateAvatarProfile, uploadImageViaServer, type AvatarProfileData } from "@/lib/api-client";
import { imageUploadErrorMessage, normalizeImageForUpload } from "@/lib/image-upload/browser-normalize";
import { IMAGE_UPLOAD_POLICY } from "@/lib/image-upload-policy";
import { safeUploadErrorMessage, safeUserMessage } from "@/lib/user-facing-errors";

type AvatarProfile = AvatarProfileData["profile"];

export function AvatarProfileForm({
  profile,
  onSaved
}: {
  profile: AvatarProfile;
  onSaved: (profile: AvatarProfile) => void;
}) {
  const [uploadedModelImageUrl, setUploadedModelImageUrl] = useState(profile.uploadedModelImageUrl || "");
  const [uploadedModelImageStorageKey, setUploadedModelImageStorageKey] = useState(profile.uploadedModelImageStorageKey || "");
  const [consentAccepted, setConsentAccepted] = useState(profile.consentAccepted);
  const [saving, setSaving] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const modelFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadedModelImageUrl(profile.uploadedModelImageUrl || "");
    setUploadedModelImageStorageKey(profile.uploadedModelImageStorageKey || "");
    setConsentAccepted(profile.consentAccepted);
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    setNotice("");
    setError("");

    const result = await updateAvatarProfile({
      tryOnModelSource: uploadedModelImageUrl ? "uploaded" : "none",
      uploadedModelImageUrl: uploadedModelImageUrl || null,
      uploadedModelImageStorageKey: uploadedModelImageStorageKey || null,
      consentAccepted
    });

    setSaving(false);
    if (!result.ok) {
      setError(safeUserMessage(result.error, "Unable to save your photo settings."));
      return;
    }

    onSaved(result.data.profile);
    setNotice("Photo settings saved.");
  }

  async function saveUploadedPhoto(publicUrl: string, storageKey: string) {
    const result = await updateAvatarProfile({
      tryOnModelSource: "uploaded",
      uploadedModelImageUrl: publicUrl,
      uploadedModelImageStorageKey: storageKey,
      consentAccepted
    });
    if (!result.ok) throw new Error(safeUserMessage(result.error, "Unable to save your full-body photo."));

    onSaved(result.data.profile);
    setUploadedModelImageUrl(result.data.profile.uploadedModelImageUrl || publicUrl);
    setUploadedModelImageStorageKey(result.data.profile.uploadedModelImageStorageKey || storageKey);
    setNotice("Full-body photo saved.");
  }

  async function handleModelPhoto(file: File) {
    setUploadingModel(true);
    setNotice("");
    setError("");

    try {
      const normalized = await normalizeImageForUpload(file, {
        source: "avatar_model",
        onStage: (stage) => {
          if (stage === "converting") setNotice("Preparing your photo...");
          if (stage === "generating-preview") setNotice("Checking your full-body photo...");
        }
      });

      if (normalized.serverNormalizationRequired) {
        const fallback = await uploadImageViaServer({ file: normalized.file, purpose: "avatar_model" });
        if (!fallback.ok) throw new Error(safeUploadErrorMessage(fallback.error, "Unable to upload your full-body photo."));

        await saveUploadedPhoto(fallback.data.upload.publicUrl, fallback.data.upload.storageKey);
        URL.revokeObjectURL(normalized.previewUrl);
        return;
      }

      const signed = await requestSignedUploadUrl({
        filename: normalized.file.name,
        mimeType: normalized.file.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType,
        sizeBytes: normalized.file.size,
        purpose: "avatar_model"
      });

      if (!signed.ok) {
        const fallback = await uploadImageViaServer({ file: normalized.file, purpose: "avatar_model" });
        if (!fallback.ok) throw new Error(safeUploadErrorMessage(fallback.error, "Unable to upload your full-body photo."));

        await saveUploadedPhoto(fallback.data.upload.publicUrl, fallback.data.upload.storageKey);
        URL.revokeObjectURL(normalized.previewUrl);
        return;
      }

      const uploadAccess = signed.data.upload;
      if (!uploadAccess.ready || !uploadAccess.uploadUrl) {
        throw new Error(safeUploadErrorMessage(uploadAccess.message, "Unable to upload your full-body photo."));
      }

      const uploadResponse = await fetch(uploadAccess.uploadUrl, {
        method: uploadAccess.method || "PUT",
        headers: uploadAccess.headers || { "content-type": normalized.file.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType },
        body: normalized.file
      });

      if (!uploadResponse.ok) {
        const fallback = await uploadImageViaServer({ file: normalized.file, purpose: "avatar_model" });
        if (!fallback.ok) throw new Error("We could not upload your full-body photo.");

        await saveUploadedPhoto(fallback.data.upload.publicUrl, fallback.data.upload.storageKey);
        URL.revokeObjectURL(normalized.previewUrl);
        return;
      }

      const imageUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl.split("?")[0] || "";
      await saveUploadedPhoto(imageUrl, uploadAccess.storageKey);
      URL.revokeObjectURL(normalized.previewUrl);
    } catch (uploadError) {
      setError(safeUploadErrorMessage(imageUploadErrorMessage(uploadError) || uploadError, "Unable to upload your full-body photo."));
    } finally {
      setUploadingModel(false);
    }
  }

  async function removePhoto() {
    setSaving(true);
    setNotice("");
    setError("");

    const result = await updateAvatarProfile({
      tryOnModelSource: "none",
      uploadedModelImageUrl: null,
      uploadedModelImageStorageKey: null,
      consentAccepted
    });

    setSaving(false);
    if (!result.ok) {
      setError(safeUserMessage(result.error, "Unable to remove your full-body photo."));
      return;
    }

    onSaved(result.data.profile);
    setUploadedModelImageUrl("");
    setUploadedModelImageStorageKey("");
    setNotice("Full-body photo removed.");
  }

  const hasUploadedPhoto = Boolean(uploadedModelImageUrl);

  return (
    <Card className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
            <Camera size={14} aria-hidden="true" />
            Appearance
          </p>
          <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Upload your full-body photo.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            MyFitPick uses this image as your Virtual Try-On model. Choose a clear full-body image where your head, outfit area, and feet are visible.
          </p>
        </div>
        <Badge tone="premium">User controlled</Badge>
      </div>

      {error ? <p className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}
      {notice ? <p className="rounded-2xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-ink">{notice}</p> : null}

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

      <section className="grid gap-4 rounded-xl3 border border-line bg-gradient-to-br from-canvas/80 via-canvas/60 to-olive/10 p-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface/80">
          {hasUploadedPhoto ? (
            <img src={uploadedModelImageUrl} alt="Uploaded full-body photo" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center px-6 text-center">
              <div>
                <ImagePlus className="mx-auto text-olive" size={34} aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-ink">No full-body photo yet</p>
                <p className="mt-1 text-xs leading-5 text-muted">Upload one image before using Virtual Try-On.</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Photo guide</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-muted">
              <li>Use a full-body image with your head and feet visible.</li>
              <li>Good lighting helps create a cleaner preview.</li>
              <li>A saved photo from your camera roll is fine.</li>
            </ul>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" className="rounded-full" disabled={uploadingModel || saving} onClick={() => modelFileInputRef.current?.click()}>
              {uploadingModel ? "Uploading..." : hasUploadedPhoto ? "Replace photo" : "Upload full-body photo"}
            </Button>
            {hasUploadedPhoto ? (
              <Button type="button" variant="secondary" className="rounded-full" disabled={uploadingModel || saving} onClick={() => void removePhoto()}>
                <Trash2 size={16} aria-hidden="true" />
                Remove photo
              </Button>
            ) : null}
          </div>
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
            I understand Virtual Try-On previews are estimates, not perfect fittings.
          </span>
        </span>
      </label>

      <Button type="button" variant="secondary" className="w-full rounded-full" onClick={() => void saveProfile()} disabled={saving || uploadingModel}>
        {saving ? "Saving..." : "Save photo settings"}
      </Button>
    </Card>
  );
}
