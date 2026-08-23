"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Images, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createWardrobeUploadBatch, uploadImageViaServer, uploadWardrobeMetadata } from "@/lib/api-client";

type SelectedPhoto = { file: File; previewUrl: string; state: "selected" | "uploading" | "ready" | "failed"; message?: string; uploadId?: string; backgroundRemoved?: boolean };

export function WardrobeBulkUploadClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const readyCount = photos.filter((photo) => photo.state === "ready").length;
  const canSubmit = photos.length >= 2 && photos.length <= 5 && !busy;
  const totalMb = useMemo(() => photos.reduce((sum, photo) => sum + photo.file.size, 0) / 1024 / 1024, [photos]);

  function chooseFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files).slice(0, 5);
    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file), state: "selected" }));
    });
    setMessage(selected.length < 2 ? "Choose at least two separate closet items." : "");
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
    setMessage("");
  }

  async function prepareBatch() {
    if (!canSubmit) return;
    setBusy(true);
    setMessage("Uploading and preparing each item independently…");
    const working = [...photos];

    for (let index = 0; index < working.length; index += 1) {
      if (working[index].uploadId) continue;
      working[index] = { ...working[index], state: "uploading", message: "Preparing photo" };
      setPhotos([...working]);
      const uploaded = await uploadImageViaServer({ file: working[index].file, purpose: "wardrobe_original" });
      if (!uploaded.ok) {
        working[index] = { ...working[index], state: "failed", message: uploaded.error.message };
        setPhotos([...working]);
        continue;
      }
      const asset = uploaded.data.upload;
      const backgroundMessage = asset.backgroundRemovalApplied ? "Background removed · Ready" : "Ready · Original background kept";
      const recorded = await uploadWardrobeMetadata({
        filename: asset.filename || working[index].file.name,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        provider: "s3",
        storageKey: asset.storageKey,
        imageUrl: asset.publicUrl,
        sourceImageHash: asset.contentHash,
        perceptualImageHash: asset.perceptualHash,
        uploadStatus: "uploaded",
        images: { front: { url: asset.publicUrl, storageKey: asset.storageKey, provider: "s3", purpose: "front", uploadedAt: new Date().toISOString(), variants: asset.original ? { original: { url: asset.original.publicUrl, storageKey: asset.original.storageKey, provider: "s3", width: asset.original.width, height: asset.original.height, bytes: asset.original.sizeBytes, status: "ready", processedAt: new Date().toISOString() } } : undefined }, additional: [] },
        userInputMetadata: { intakeMode: "multi_item_batch", primaryImagePurpose: "front", photoCount: 1 }
      });
      if (!recorded.ok) {
        working[index] = { ...working[index], state: "failed", message: recorded.error.message };
        setPhotos([...working]);
        continue;
      }
      working[index] = { ...working[index], state: "ready", message: backgroundMessage, uploadId: recorded.data.upload.id, backgroundRemoved: asset.backgroundRemovalApplied };
      setPhotos([...working]);
    }

    const readyUploadIds = working.map((photo) => photo.uploadId).filter((id): id is string => Boolean(id));
    if (readyUploadIds.length < 2) {
      setBusy(false);
      setMessage("At least two items must upload successfully. Remove failed photos or try again.");
      return;
    }
    const batch = await createWardrobeUploadBatch(readyUploadIds);
    setBusy(false);
    if (!batch.ok) { setMessage(batch.error.message); return; }
    router.push(`/wardrobe/bulk-upload/${batch.data.batch.id}`);
  }

  return (
    <div className="mt-7 space-y-5">
      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-cocoa/10 p-2 text-cocoa"><Images size={22} aria-hidden="true" /></span>
          <div><h2 className="text-lg font-semibold text-ink">Add 2–5 separate items</h2><p className="mt-1 text-sm leading-6 text-muted">Use one clear photo per fashion item. MyFitPick analyzes every photo separately.</p></div>
        </div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(event) => chooseFiles(event.target.files)} />
        <Button type="button" variant="secondary" className="w-full" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={17} aria-hidden="true" />Choose item photos</Button>
        {photos.length ? <p className="text-xs text-muted">{photos.length} item{photos.length === 1 ? "" : "s"} · {totalMb.toFixed(1)} MB total</p> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => <div key={`${photo.file.name}-${index}`} className="overflow-hidden rounded-2xl border border-line bg-surfaceWarm"><div className="relative aspect-square"><Image src={photo.previewUrl} alt={`Selected closet item ${index + 1}`} fill unoptimized className="object-cover" /><button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => removePhoto(index)} disabled={busy} className="focus-ring absolute right-2 top-2 rounded-full bg-white/90 p-2 text-ink shadow-soft disabled:opacity-50"><Trash2 size={15} aria-hidden="true" /></button></div><div className="p-3"><p className="truncate text-xs font-semibold text-ink">Item {index + 1}</p><p className="mt-1 text-[11px] text-muted">{photo.message || "Selected"}</p></div></div>)}
        </div>
        {message ? <p role="status" className="rounded-xl bg-canvasSubtle px-3 py-2 text-sm text-ink">{message}</p> : null}
        <div className="flex items-start gap-2 rounded-2xl border border-success/20 bg-success/5 p-3 text-xs leading-5 text-muted"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /><p>Nothing enters recommendations until you review and confirm that item. Duplicate photos are blocked.</p></div>
        <Button type="button" className="w-full" disabled={!canSubmit} onClick={() => void prepareBatch()}>{busy ? `Preparing ${readyCount + 1} of ${photos.length}…` : "Analyze these items"}</Button>
      </Card>
    </div>
  );
}
