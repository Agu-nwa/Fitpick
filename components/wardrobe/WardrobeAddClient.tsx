"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeLoadingState,
  WardrobeSaveSuccessState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { WardrobeTagReviewForm, type WardrobeTagFormValues } from "@/components/wardrobe/WardrobeTagReviewForm";
import { useSession } from "@/hooks/use-session";
import {
  createWardrobeItem,
  requestSignedUploadUrl,
  reviewWardrobeUploadTags,
  suggestWardrobeUploadTags,
  uploadWardrobeMetadata,
  type WardrobeUploadRecord
} from "@/lib/api-client";
import type { AiSuggestedWardrobeTags } from "@/types/ai-tagging";
import type { WardrobeItem } from "@/types/wardrobe";

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";

function cleanItemPayload(values: WardrobeTagFormValues) {
  return {
    name: values.name,
    category: values.category,
    subcategory: values.subcategory || "",
    color: values.color,
    pattern: values.pattern || "",
    fabric: values.fabric || "",
    fit: values.fit || "",
    formality: values.formality,
    occasions: values.occasions,
    weather: values.weather,
    condition: values.condition
  };
}

export function WardrobeAddClient() {
  const session = useSession();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("linen-shirt-photo.jpg");
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [sizeBytes, setSizeBytes] = useState("1250000");
  const [width, setWidth] = useState("1200");
  const [height, setHeight] = useState("1600");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [upload, setUpload] = useState<WardrobeUploadRecord | null>(null);
  const [createdItem, setCreatedItem] = useState<WardrobeItem | null>(null);
  const [suggestedItem, setSuggestedItem] = useState<Partial<WardrobeItem> | null>(null);
  const [suggestion, setSuggestion] = useState<AiSuggestedWardrobeTags | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleUploadRecord(
    cloudinaryMetadata?: {
      provider: "cloudinary";
      storageKey: string;
      publicId: string;
      imageUrl: string;
      secureUrl: string;
      thumbnailUrl: string;
    },
    fileMetadata?: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      width?: number;
      height?: number;
    }
  ) {
    setIsSaving(true);
    setStatus("idle");
    const result = await uploadWardrobeMetadata({
      filename: fileMetadata?.filename || filename,
      mimeType: fileMetadata?.mimeType || mimeType,
      sizeBytes: fileMetadata?.sizeBytes || Number(sizeBytes),
      width: fileMetadata?.width || Number(width),
      height: fileMetadata?.height || Number(height),
      ...(cloudinaryMetadata || {}),
      uploadStatus: cloudinaryMetadata ? "uploaded" : undefined,
      suggestedTags: {
        category: "tops",
        color: "Neutral",
        occasions: ["casual"],
        weather: ["dry"]
      }
    });
    setIsSaving(false);

    if (result.ok) {
      setUpload(result.data.upload);
      setSuggestedItem(null);
      setSuggestion(null);
      return;
    }

    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }

  function updateSelectedFile(file: File) {
    setSelectedFile(file);
    setFilename(file.name);
    setMimeType(file.type || "image/jpeg");
    setSizeBytes(String(file.size));
    setPreviewUrl(URL.createObjectURL(file));
    setMessage("");
    setUpload(null);
    setSuggestedItem(null);
    setSuggestion(null);
  }

  async function handleSignedCloudinaryUpload(file = selectedFile) {
    if (!file) {
      setMessage("Choose an image first, or use manual item creation below.");
      return;
    }

    setIsSaving(true);
    setStatus("idle");
    setMessage("");

    const signed = await requestSignedUploadUrl({
      filename: file.name,
      mimeType: file.type || mimeType,
      sizeBytes: file.size,
      purpose: "wardrobe_original"
    });

    if (!signed.ok) {
      setIsSaving(false);
      setMessage("We could not upload this photo. Try again or add the item manually.");
      setStatus(signed.error.code === "INTERNAL_ERROR" ? "unavailable" : "idle");
      return;
    }

    const uploadUrl = signed.data.upload.uploadUrl;

    if (!signed.data.upload.ready || !uploadUrl) {
      setIsSaving(false);
      setMessage(signed.data.upload.message || "Image upload is not configured yet.");
      return;
    }

    const uploadAccess = signed.data.upload;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", uploadAccess.apiKey || "");
    formData.append("timestamp", String(uploadAccess.timestamp || ""));
    formData.append("signature", uploadAccess.signature || "");
    formData.append("folder", uploadAccess.folder || "");
    formData.append("public_id", uploadAccess.publicId || "");

    try {
      const cloudinaryResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });
      const cloudinaryPayload = await cloudinaryResponse.json();

      if (!cloudinaryResponse.ok || !cloudinaryPayload?.secure_url || !cloudinaryPayload?.public_id) {
        setStatus("idle");
        setMessage("We could not upload this photo. Try again or add the item manually.");
        setIsSaving(false);
        return;
      }

      const secureUrl = String(cloudinaryPayload.secure_url);
      const publicId = String(cloudinaryPayload.public_id);
      const thumbnailUrl = secureUrl.replace("/upload/", "/upload/c_fill,w_480,h_640,q_auto,f_auto/");
      setPreviewUrl(thumbnailUrl);
      setFilename(file.name);
      setMimeType(file.type || mimeType);
      setSizeBytes(String(file.size));
      setWidth(String(cloudinaryPayload.width || width));
      setHeight(String(cloudinaryPayload.height || height));
      setIsSaving(false);
      await handleUploadRecord({
        provider: "cloudinary",
        storageKey: publicId,
        publicId,
        imageUrl: secureUrl,
        secureUrl,
        thumbnailUrl
      }, {
        filename: file.name,
        mimeType: file.type || mimeType,
        sizeBytes: file.size,
        width: Number(cloudinaryPayload.width || width),
        height: Number(cloudinaryPayload.height || height)
      });
    } catch {
      setIsSaving(false);
      setMessage("We could not upload this photo. Try again or add the item manually.");
      setStatus("unavailable");
    }
  }

  async function handleReviewTags(values: WardrobeTagFormValues) {
    if (!upload) return;
    setIsSaving(true);
    setStatus("idle");
    const result = await reviewWardrobeUploadTags(upload.id, cleanItemPayload(values));
    setIsSaving(false);

    if (result.ok) {
      setCreatedItem(result.data.item);
      setUpload(result.data.upload);
      return;
    }

    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }

  async function handleSuggestTags() {
    if (!upload) return;
    setIsSuggesting(true);
    setStatus("idle");
    setMessage("");

    const result = await suggestWardrobeUploadTags(upload.id);
    setIsSuggesting(false);

    if (result.ok && result.data.suggestedTags) {
      const tags = result.data.suggestedTags;
      if (result.data.aiTagStatus === "failed") {
        setMessage(result.data.safeMessage || "We could not suggest tags. Add tags manually.");
        return;
      }

      setSuggestion(tags);
      setSuggestedItem({
        name: tags.name || "",
        category: tags.category || "tops",
        subcategory: tags.subcategory || "",
        color: tags.color || "",
        pattern: tags.pattern || "",
        fabric: tags.fabric || "",
        fit: tags.fit || "",
        formality: tags.formality || [],
        occasions: tags.occasions || [],
        weather: tags.weather || [],
        condition: tags.condition || "missing-tags"
      });
      setMessage("Review suggested tags. Edit anything before saving.");
      return;
    }

    setMessage("We could not suggest tags. Add tags manually.");
    setStatus(result.ok || result.error.code !== "INTERNAL_ERROR" ? "idle" : "unavailable");
  }

  async function handleManualCreate(values: WardrobeTagFormValues) {
    setIsSaving(true);
    setStatus("idle");
    const result = await createWardrobeItem(cleanItemPayload(values));
    setIsSaving(false);

    if (result.ok) {
      setCreatedItem(result.data.item);
      return;
    }

    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }

  if (session.status === "loading") return <WardrobeLoadingState />;
  if (session.status === "logged-out") return <WardrobeAuthRequiredState />;
  if (session.status === "backend-unavailable") return <WardrobeBackendUnavailableState onRetry={session.refresh} />;

  return (
    <div className="mt-7 space-y-7">
      {status === "unavailable" ? <WardrobeBackendUnavailableState /> : null}
      {status === "error" ? <WardrobeApiErrorState /> : null}
      {createdItem ? (
        <WardrobeSaveSuccessState
          title="Added to wardrobe"
          body={`${createdItem.name} is saved and ready for outfit planning.`}
          href={`/wardrobe/${createdItem.id}`}
        />
      ) : null}

      <section>
        <SectionHeader title="Add a photo" eyebrow="Secure storage" />
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="focus-ring min-h-[104px] rounded-2xl border border-cocoa/20 bg-cocoa px-3 py-4 text-left text-white shadow-card transition active:scale-[0.99] disabled:opacity-50"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isSaving}
            >
              <span className="block text-base font-semibold">Take photo</span>
              <span className="mt-2 block text-xs leading-5 text-white/80">Use your camera for one clothing item.</span>
            </button>
            <button
              type="button"
              className="focus-ring min-h-[104px] rounded-2xl border border-line bg-white px-3 py-4 text-left text-ink shadow-card transition active:scale-[0.99] disabled:opacity-50"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isSaving}
            >
              <span className="block text-base font-semibold">Upload from gallery</span>
              <span className="mt-2 block text-xs leading-5 text-muted">Choose an existing wardrobe photo.</span>
            </button>
          </div>
          <input
            ref={cameraInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (!file) return;
              updateSelectedFile(file);
              void handleSignedCloudinaryUpload(file);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (!file) return;
              updateSelectedFile(file);
              void handleSignedCloudinaryUpload(file);
              event.currentTarget.value = "";
            }}
          />
          {previewUrl ? (
            <div className="aspect-[4/5] rounded-2xl bg-stone-100 bg-cover bg-center" style={{ backgroundImage: `url(${previewUrl})` }} role="img" aria-label="Selected wardrobe item preview" />
          ) : null}
          {selectedFile ? (
            <p className="rounded-2xl bg-cocoa/10 px-3 py-2 text-xs font-semibold text-ink">
              {selectedFile.name} · {Math.max(1, Math.round(selectedFile.size / 1024))} KB
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block text-xs font-semibold text-ink">
              File name
              <input className={inputClass} value={filename} onChange={(event) => setFilename(event.target.value)} />
            </label>
            <label className="block text-xs font-semibold text-ink">
              Type
              <select className={inputClass} value={mimeType} onChange={(event) => setMimeType(event.target.value)}>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
                <option value="image/heic">HEIC</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-ink">
              Size
              <input className={inputClass} value={sizeBytes} onChange={(event) => setSizeBytes(event.target.value)} inputMode="numeric" />
            </label>
            <label className="block text-xs font-semibold text-ink">
              Width
              <input className={inputClass} value={width} onChange={(event) => setWidth(event.target.value)} inputMode="numeric" />
            </label>
            <label className="block text-xs font-semibold text-ink">
              Height
              <input className={inputClass} value={height} onChange={(event) => setHeight(event.target.value)} inputMode="numeric" />
            </label>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => void handleSignedCloudinaryUpload()}
            disabled={isSaving}
          >
            Try upload again
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => void handleUploadRecord()}
            disabled={isSaving}
          >
            Continue without image
          </Button>
          {message ? (
            <p className="rounded-2xl bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">
              {message}
            </p>
          ) : null}
          {upload ? (
            <p className="rounded-2xl bg-success/10 px-3 py-2 text-xs font-semibold text-ink">
              Upload record ready for tag review.
            </p>
          ) : null}
        </Card>
      </section>

      {upload ? (
        <section>
          <SectionHeader title={suggestion ? "Review suggested tags" : "Review photo tags"} eyebrow="Next step" />
          <Card className="space-y-4">
            <Button type="button" variant="secondary" className="w-full" onClick={() => void handleSuggestTags()} disabled={isSaving || isSuggesting}>
              {isSuggesting ? "Suggesting tags..." : "Suggest tags"}
            </Button>
            {suggestion ? (
              <div className="rounded-2xl bg-cocoa/10 px-3 py-2 text-xs leading-5 text-ink">
                <p className="font-semibold">Edit anything before saving.</p>
                {suggestion.confidence < 0.7 ? <p className="mt-1 text-muted">Some suggestions may need a closer look.</p> : null}
              </div>
            ) : null}
            <WardrobeTagReviewForm
              initialItem={suggestedItem || undefined}
              showName
              submitLabel="Save reviewed item"
              disabled={isSaving || isSuggesting}
              onSubmit={handleReviewTags}
            />
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title="Add manually" />
        <Card>
          <WardrobeTagReviewForm showName submitLabel="Create wardrobe item" disabled={isSaving} onSubmit={handleManualCreate} />
        </Card>
      </section>

      <Link href="/wardrobe" className="block text-center text-sm font-semibold text-cocoa">
        Back to wardrobe
      </Link>
    </div>
  );
}
