"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, ImagePlus, PencilLine, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
  uploadWardrobeMetadata
} from "@/lib/api-client";
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
    const signed = await requestSignedUploadUrl({
      filename: slot.file.name,
      mimeType: slot.file.type || "image/jpeg",
      sizeBytes: slot.file.size,
      purpose: `wardrobe_${purpose}`
    });

    if (!signed.ok) throw new Error(signed.error.message);
    const uploadAccess = signed.data.upload;
    const uploadUrl = uploadAccess.uploadUrl;
    if (!uploadAccess.ready || !uploadUrl) {
      throw new Error(uploadAccess.message || "Image upload is not configured yet.");
    }

    const s3Response = await fetch(uploadUrl, {
      method: uploadAccess.method || "PUT",
      headers: uploadAccess.headers || { "content-type": slot.file.type || "image/jpeg" },
      body: slot.file
    });

    if (!s3Response.ok) throw new Error("We could not upload one of the photos.");

    const publicUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl?.split("?")[0] || "";

    return {
      url: publicUrl,
      storageKey: uploadAccess.storageKey,
      provider: "s3",
      uploadedAt: new Date().toISOString(),
      purpose,
      filename: slot.file.name,
      mimeType: slot.file.type || "image/jpeg",
      sizeBytes: slot.file.size,
      width: 1,
      height: 1,
      thumbnailUrl: publicUrl
    };
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
        setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
        setMessage("MyFitPick could not create the upload record.");
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
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not upload these photos. Try again.");
    }
  }

  if (session.status === "loading") return <WardrobeLoadingState />;
  if (session.status === "logged-out") return <WardrobeAuthRequiredState />;
  if (session.status === "backend-unavailable") return <WardrobeBackendUnavailableState onRetry={session.refresh} />;

  return (
    <div className="mt-7 space-y-7">
      {status === "unavailable" ? <WardrobeBackendUnavailableState /> : null}
      {status === "error" ? <WardrobeApiErrorState /> : null}

      <section>
        <SectionHeader title="What are you adding?" eyebrow="Start here" />
        <Card className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {categoryOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`focus-ring min-h-24 rounded-2xl border p-3 text-left transition ${
                  selectedCategoryLabel === option.label
                    ? "border-cocoa bg-cocoa text-canvas shadow-glow"
                    : "border-line bg-canvas/70 text-ink hover:border-cocoa/40"
                }`}
                onClick={() => selectCategory(option.label)}
              >
                <span className="block text-sm font-bold">{option.label}</span>
                <span className={`mt-2 block text-xs leading-5 ${selectedCategoryLabel === option.label ? "text-canvas/70" : "text-muted"}`}>
                  {option.helper}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Add photos" eyebrow={selectedCategory ? selectedCategory.label : "Choose category first"} />
        <Card className="space-y-4 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                <ImagePlus size={14} aria-hidden="true" />
                Wardrobe upload
              </p>
              <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Photograph one piece.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Add a clear main photo. Use optional detail photos when they help MyFitPick read brand, material, size, serial marks, care, or authenticity details.
              </p>
            </div>
            <Badge tone={selectedCategory && !missingRequired.length ? "success" : "warning"}>
              {selectedCategory ? `${selectedCount}/${activeSlots.length} added` : "Pick category"}
            </Badge>
          </div>
          <ProgressSteps steps={[...uploadSteps]} />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-canvas/60 px-3 py-2">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink">
              <Camera size={14} className="text-cocoa" aria-hidden="true" />
              Add label or product details - optional
            </p>
            <span className="text-xs leading-5 text-muted">
              Label, serial number, hallmark, engraving, size marking, care tag, or product code.
            </span>
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
            <div className="grid gap-3 sm:grid-cols-2">
              {activeSlots.map((slot) => {
                const selected = slotFiles[slot.key];
                return (
                  <div key={slot.key} className="rounded-2xl border border-line bg-canvas/60 p-3 shadow-card">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">{slot.label}</p>
                    <p className="mt-1 min-h-8 break-words text-[11px] leading-4 text-muted">{selected ? selected.file.name : slot.helper}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => handleSelectSlot(slot.key)} disabled={isSaving || isAnalyzing}>
                        {selected ? <PencilLine size={13} aria-hidden="true" /> : <ImagePlus size={13} aria-hidden="true" />}
                        {selected ? "Replace" : "Add"}
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
            <p className="rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">
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
