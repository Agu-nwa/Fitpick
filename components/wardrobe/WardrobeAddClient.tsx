"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, PencilLine, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeLoadingState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { WardrobeImageSlots, type WardrobeImageSlotDefinition } from "@/components/wardrobe/WardrobeImageSlots";
import { useSession } from "@/hooks/use-session";
import {
  analyzeWardrobeUpload,
  requestSignedUploadUrl,
  uploadImageViaServer,
  uploadWardrobeMetadata
} from "@/lib/api-client";
import { MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB, isAllowedImageMimeType } from "@/lib/upload-limits";
import type { WardrobeImageAsset, WardrobeImagePurpose } from "@/types/ai-tagging";
import type { WardrobeCategory } from "@/types/wardrobe";

type CategoryOption = {
  label: string;
  backendCategory: WardrobeCategory;
  subcategory?: string;
  helper: string;
  slots: WardrobeImageSlotDefinition[];
};

const categoryOptions: CategoryOption[] = [
  {
    label: "Top",
    backendCategory: "tops",
    helper: "Shirts, tees, blouses, knits, and similar pieces.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full front view", required: true },
      { key: "back", label: "Additional angle", helper: "Back or side if useful" },
      { key: "fabricCloseUp", label: "Fabric detail", helper: "Texture, weave, or pattern" },
      { key: "label", label: "Label or product details", helper: "Size, care, brand, or code" }
    ]
  },
  {
    label: "Bottom",
    backendCategory: "bottoms",
    helper: "Trousers, jeans, skirts, shorts, and similar pieces.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full item view", required: true },
      { key: "back", label: "Additional angle", helper: "Back or side if useful" },
      { key: "fabricCloseUp", label: "Fabric detail", helper: "Texture, weave, or stretch" },
      { key: "label", label: "Label or product details", helper: "Size, care, brand, or code" }
    ]
  },
  {
    label: "Dress",
    backendCategory: "dresses",
    helper: "Dresses, gowns, jumpsuits, and one-piece outfits.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full item view", required: true },
      { key: "back", label: "Additional angle", helper: "Back or side if useful" },
      { key: "fabricCloseUp", label: "Fabric detail", helper: "Texture, drape, or pattern" },
      { key: "label", label: "Label or product details", helper: "Size, care, brand, or code" }
    ]
  },
  {
    label: "Outerwear",
    backendCategory: "outerwear",
    helper: "Jackets, coats, blazers, cardigans, and layers.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full item view", required: true },
      { key: "back", label: "Additional angle", helper: "Back or lining if useful" },
      { key: "fabricCloseUp", label: "Material detail", helper: "Texture, hardware, or lining" },
      { key: "label", label: "Label or product details", helper: "Care, brand, size, or code" }
    ]
  },
  {
    label: "Shoes",
    backendCategory: "shoes",
    helper: "Sneakers, loafers, heels, boots, sandals, and similar items.",
    slots: [
      { key: "front", label: "Main photo", helper: "Pair or single shoe view", required: true },
      { key: "back", label: "Additional angle", helper: "Side, sole, or insole" },
      { key: "label", label: "Label or product details", helper: "Tongue, insole, size, or sole marking" }
    ]
  },
  {
    label: "Bag",
    backendCategory: "bags",
    helper: "Handbags, totes, backpacks, luggage, and clutches.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full bag view", required: true },
      { key: "back", label: "Additional angle", helper: "Interior or hardware" },
      { key: "label", label: "Label or product details", helper: "Interior stamp, date code, or serial detail" }
    ]
  },
  {
    label: "Watch",
    backendCategory: "accessories",
    subcategory: "Watch",
    helper: "Watches, straps, and timepieces.",
    slots: [
      { key: "front", label: "Main photo", helper: "Dial and strap", required: true },
      { key: "back", label: "Additional angle", helper: "Case-back or clasp" },
      { key: "label", label: "Label or product details", helper: "Serial, reference, box, or certificate" }
    ]
  },
  {
    label: "Jewellery",
    backendCategory: "accessories",
    subcategory: "Jewellery",
    helper: "Rings, necklaces, bracelets, earrings, and fine jewellery.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full item view", required: true },
      { key: "back", label: "Additional angle", helper: "Clasp, setting, or underside" },
      { key: "label", label: "Label or product details", helper: "Hallmark, engraving, or certificate" }
    ]
  },
  {
    label: "Accessory",
    backendCategory: "accessories",
    helper: "Belts, scarves, eyewear, hats, and smaller pieces.",
    slots: [
      { key: "front", label: "Main photo", helper: "Full item view", required: true },
      { key: "back", label: "Additional angle", helper: "Back, clasp, or interior" },
      { key: "label", label: "Label or product details", helper: "Stamp, code, size, or care detail" }
    ]
  },
  {
    label: "Other",
    backendCategory: "accessories",
    subcategory: "Other",
    helper: "Use this when the item does not fit another category.",
    slots: [
      { key: "front", label: "Main photo", helper: "Clear full item view", required: true },
      { key: "back", label: "Additional angle", helper: "Any useful second view" },
      { key: "label", label: "Label or product details", helper: "Marking, code, or product detail" }
    ]
  }
];

type SlotFile = {
  file: File;
  previewUrl: string;
};

type UploadedSlot = WardrobeImageAsset & {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  thumbnailUrl: string;
};

function toImageAsset(uploaded?: UploadedSlot): WardrobeImageAsset | undefined {
  if (!uploaded) return undefined;
  return {
    url: uploaded.url,
    storageKey: uploaded.storageKey,
    provider: uploaded.provider,
    uploadedAt: uploaded.uploadedAt,
    purpose: uploaded.purpose
  };
}

function localSlotAssets(slotFiles: Partial<Record<WardrobeImagePurpose, SlotFile>>) {
  return Object.fromEntries(
    Object.entries(slotFiles).map(([purpose, value]) => [
      purpose,
      {
        url: value?.previewUrl || "",
        storageKey: "",
        provider: "browser_preview",
        purpose
      }
    ])
  ) as Partial<Record<WardrobeImagePurpose, WardrobeImageAsset>>;
}

function mimeTypeForFile(file: File) {
  const type = file.type?.toLowerCase();
  if (type) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

function validateLocalImage(file: File) {
  const mimeType = mimeTypeForFile(file);
  if (!isAllowedImageMimeType(mimeType)) return "Choose a JPG, PNG, WebP, or HEIC image.";
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return `This photo is too large. Choose an image under ${MAX_IMAGE_UPLOAD_MB} MB.`;
  if (file.size <= 0) return "Choose a valid image file.";
  return "";
}

function uploadFailureMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/failed to fetch|network|cors|direct_upload_failed|s3/i.test(message)) {
    return "We could not send the photo to storage. Try again, or use a smaller JPG/PNG image.";
  }
  return message || "We could not upload these photos. Try again.";
}

export function WardrobeAddClient() {
  const session = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState("");
  const selectedCategory = categoryOptions.find((option) => option.label === selectedCategoryLabel);
  const [activePurpose, setActivePurpose] = useState<WardrobeImagePurpose>("front");
  const [slotFiles, setSlotFiles] = useState<Partial<Record<WardrobeImagePurpose, SlotFile>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<"idle" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState("");

  const activeSlots = selectedCategory?.slots || [];
  const requiredSlots = activeSlots.filter((slot) => slot.required);
  const slotImages = useMemo(() => localSlotAssets(slotFiles), [slotFiles]);
  const selectedCount = activeSlots.filter((slot) => slotFiles[slot.key]).length;
  const missingRequired = requiredSlots.filter((slot) => !slotFiles[slot.key]);
  const uploadSteps = [
    { label: "Choose category", status: selectedCategory ? "complete" : "current" },
    { label: "Add photos", status: selectedCategory && !missingRequired.length ? "complete" : selectedCategory ? "current" : "pending" },
    { label: "Review details", status: isAnalyzing ? "current" : "pending" }
  ] as const;

  function selectCategory(label: string) {
    setSelectedCategoryLabel(label);
    setActivePurpose("front");
    setMessage("");
    setStatus("idle");
  }

  function handleSelectSlot(purpose: WardrobeImagePurpose) {
    if (!selectedCategory) {
      setMessage("Choose what you are adding first.");
      return;
    }
    setActivePurpose(purpose);
    fileInputRef.current?.click();
  }

  function handleFile(purpose: WardrobeImagePurpose, file: File) {
    const validationMessage = validateLocalImage(file);
    if (validationMessage) {
      setMessage(validationMessage);
      setStatus("idle");
      return;
    }

    setSlotFiles((current) => {
      if (current[purpose]?.previewUrl) URL.revokeObjectURL(current[purpose]?.previewUrl || "");
      return {
        ...current,
        [purpose]: {
          file,
          previewUrl: URL.createObjectURL(file)
        }
      };
    });
    setMessage("");
    setStatus("idle");
  }

  function removeSlot(purpose: WardrobeImagePurpose) {
    setSlotFiles((current) => {
      if (current[purpose]?.previewUrl) URL.revokeObjectURL(current[purpose]?.previewUrl || "");
      const next = { ...current };
      delete next[purpose];
      return next;
    });
  }

  async function uploadSlot(purpose: WardrobeImagePurpose, slot: SlotFile): Promise<UploadedSlot> {
    const mimeType = mimeTypeForFile(slot.file);
    const validationMessage = validateLocalImage(slot.file);
    if (validationMessage) throw new Error(validationMessage);

    const makeUploadedSlot = (input: { url: string; storageKey: string; provider?: string }): UploadedSlot => ({
      url: input.url,
      storageKey: input.storageKey,
      provider: "s3",
      uploadedAt: new Date().toISOString(),
      purpose,
      filename: slot.file.name,
      mimeType,
      sizeBytes: slot.file.size,
      width: 1,
      height: 1,
      thumbnailUrl: input.url
    });

    const signed = await requestSignedUploadUrl({
      filename: slot.file.name,
      mimeType,
      sizeBytes: slot.file.size,
      purpose: `wardrobe_${purpose}`
    });

    if (!signed.ok) {
      const fallback = await uploadImageViaServer({ file: slot.file, purpose: `wardrobe_${purpose}` });
      if (fallback.ok) return makeUploadedSlot({ url: fallback.data.upload.publicUrl, storageKey: fallback.data.upload.storageKey });
      throw new Error(signed.error.message || fallback.error.message);
    }

    const uploadAccess = signed.data.upload;
    const uploadUrl = uploadAccess.uploadUrl;
    if (!uploadAccess.ready || !uploadUrl) {
      throw new Error(uploadAccess.message || "Image upload is not configured yet.");
    }

    try {
      const s3Response = await fetch(uploadUrl, {
        method: uploadAccess.method || "PUT",
        headers: uploadAccess.headers || { "content-type": mimeType },
        body: slot.file
      });

      if (!s3Response.ok) throw new Error("direct_upload_failed");

      const publicUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl?.split("?")[0] || "";
      return makeUploadedSlot({ url: publicUrl, storageKey: uploadAccess.storageKey });
    } catch {
      const fallback = await uploadImageViaServer({ file: slot.file, purpose: `wardrobe_${purpose}` });
      if (fallback.ok) return makeUploadedSlot({ url: fallback.data.upload.publicUrl, storageKey: fallback.data.upload.storageKey });
      throw new Error(fallback.error.message || "direct_upload_failed");
    }
  }

  async function handlePhotoUpload() {
    if (!selectedCategory) {
      setMessage("Choose what you are adding first.");
      return;
    }

    if (missingRequired.length) {
      setMessage("Add a main photo before continuing.");
      return;
    }

    setIsSaving(true);
    setStatus("idle");
    setMessage("");

    try {
      const uploadableSlots = activeSlots
        .map((slot) => ({ purpose: slot.key, slot: slotFiles[slot.key] }))
        .filter((entry): entry is { purpose: WardrobeImagePurpose; slot: SlotFile } => Boolean(entry.slot));
      const uploaded = await Promise.all(uploadableSlots.map((entry) => uploadSlot(entry.purpose, entry.slot)));
      const byPurpose = Object.fromEntries(uploaded.map((asset) => [asset.purpose, asset])) as Partial<Record<WardrobeImagePurpose, UploadedSlot>>;
      const primary = byPurpose.front || uploaded[0];

      if (!primary) throw new Error("Add a main photo before continuing.");

      const result = await uploadWardrobeMetadata({
        filename: primary.filename,
        mimeType: primary.mimeType,
        sizeBytes: primary.sizeBytes,
        width: primary.width || 1,
        height: primary.height || 1,
        provider: "s3",
        storageKey: primary.storageKey,
        publicId: primary.storageKey,
        imageUrl: primary.url,
        secureUrl: primary.url,
        thumbnailUrl: primary.thumbnailUrl,
        uploadStatus: "uploaded",
        selectedCategory: selectedCategory.backendCategory,
        selectedCategoryLabel: selectedCategory.label,
        suggestedTags: {
          category: selectedCategory.backendCategory,
          subcategory: selectedCategory.subcategory || selectedCategory.label
        },
        images: {
          ...(toImageAsset(byPurpose.front) ? { front: toImageAsset(byPurpose.front) } : {}),
          ...(toImageAsset(byPurpose.back) ? { back: toImageAsset(byPurpose.back) } : {}),
          ...(toImageAsset(byPurpose.fabricCloseUp) ? { fabricCloseUp: toImageAsset(byPurpose.fabricCloseUp) } : {}),
          ...(toImageAsset(byPurpose.label) ? { label: toImageAsset(byPurpose.label) } : {}),
          additional: []
        }
      });

      if (!result.ok) {
        setStatus("idle");
        setMessage(result.error.message || "MyFitPick could not save the upload. Try again.");
        return;
      }

      setIsSaving(false);
      setIsAnalyzing(true);
      const analysis = await analyzeWardrobeUpload(result.data.upload.id);
      setIsAnalyzing(false);

      if (!analysis.ok) {
        setMessage("Upload saved, but the detail check did not finish. You can review the item on the next screen.");
      }

      router.push(`/wardrobe/${result.data.upload.id}/confirm`);
    } catch (error) {
      setIsSaving(false);
      setIsAnalyzing(false);
      setStatus("idle");
      setMessage(uploadFailureMessage(error));
    }
  }

  if (session.status === "loading") return <WardrobeLoadingState />;
  if (session.status === "logged-out") return <WardrobeAuthRequiredState />;
  if (session.status === "backend-unavailable") return <WardrobeBackendUnavailableState onRetry={session.refresh} />;

  return (
    <div className="mt-4 space-y-5">
      {status === "unavailable" ? <WardrobeBackendUnavailableState /> : null}
      {status === "error" ? <WardrobeApiErrorState /> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Start here</p>
            <h2 className="mt-1 text-xl font-bold text-ink">What are you adding?</h2>
          </div>
          <Badge tone={selectedCategory ? "success" : "warning"}>{selectedCategory ? selectedCategory.label : "Choose"}</Badge>
        </div>
        <div className="mobile-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-5">
            {categoryOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`focus-ring min-w-fit rounded-full border px-4 py-2 text-left transition sm:min-h-20 sm:rounded-2xl sm:p-3 ${
                  selectedCategoryLabel === option.label
                    ? "border-cocoa bg-cocoa text-canvas shadow-glow"
                    : "border-line bg-canvas/70 text-ink hover:border-cocoa/40"
                }`}
                onClick={() => selectCategory(option.label)}
              >
                <span className="block whitespace-nowrap text-sm font-bold">{option.label}</span>
                <span className={`mt-2 hidden text-xs leading-5 sm:block ${selectedCategoryLabel === option.label ? "text-canvas/70" : "text-muted"}`}>
                  {option.helper}
                </span>
              </button>
            ))}
        </div>
      </section>

      <section>
        <Card className="space-y-4 overflow-hidden p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cocoa">
                <ImagePlus size={14} aria-hidden="true" />
                Photos
              </p>
              <h2 className="mt-1 text-xl font-bold text-ink">Add one clear main photo.</h2>
              <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
                Optional detail photos help with size, fabric, care label, brand, or product code.
              </p>
            </div>
            <Badge tone={selectedCategory && !missingRequired.length ? "success" : "warning"}>
              {selectedCategory ? `${selectedCount}/${activeSlots.length} added` : "Pick category"}
            </Badge>
          </div>
          <div className="hidden sm:block">
            <ProgressSteps steps={[...uploadSteps]} />
          </div>
          {selectedCategory ? (
            <WardrobeImageSlots images={slotImages} onSelect={handleSelectSlot} disabled={isSaving || isAnalyzing} slots={activeSlots} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-canvas/60 px-4 py-8 text-center text-sm font-semibold text-muted">
              Choose a category to see the right photo slots.
            </div>
          )}
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            capture={activePurpose === "front" ? "environment" : undefined}
            onChange={(event) => {
              const file = event.target.files?.[0] || null;
              if (file) handleFile(activePurpose, file);
              event.currentTarget.value = "";
            }}
          />

          {selectedCategory ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeSlots.map((slot) => {
                const selected = slotFiles[slot.key];
                if (!selected) return null;
                return (
                  <div key={slot.key} className="rounded-2xl border border-line bg-canvas/60 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">{slot.label}</p>
                    <p className="mt-1 break-words text-[11px] leading-4 text-muted">{selected.file.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => handleSelectSlot(slot.key)} disabled={isSaving || isAnalyzing}>
                        <PencilLine size={13} aria-hidden="true" />
                        Replace
                      </Button>
                      <Button type="button" variant="ghost" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => removeSlot(slot.key)} disabled={!selected || isSaving || isAnalyzing}>
                        Clear
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <Button type="button" className="w-full" onClick={() => void handlePhotoUpload()} disabled={isSaving || isAnalyzing}>
            {isSaving || isAnalyzing ? <Sparkles size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
            {isSaving ? "Uploading photos..." : isAnalyzing ? "Checking details..." : "Upload and review details"}
          </Button>

          {message ? (
            <p className="inline-flex items-start gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-ink">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              {message}
            </p>
          ) : null}
        </Card>
      </section>

      <Link href="/wardrobe" className="block text-center text-sm font-semibold text-cocoa">
        Back to wardrobe
      </Link>
    </div>
  );
}
