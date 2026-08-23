"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Sparkles,
  UploadCloud
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeLoadingState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { WardrobeImageSlots, type WardrobeImageSlotDefinition } from "@/components/wardrobe/WardrobeImageSlots";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import {
  analyzeWardrobeUpload,
  confirmWardrobeUploadTags,
  requestSignedUploadUrl,
  uploadImageViaServer,
  uploadWardrobeMetadata
} from "@/lib/api-client";
import { imageUploadErrorMessage, normalizeImageForUpload, type NormalizedImageUpload } from "@/lib/image-upload/browser-normalize";
import { IMAGE_UPLOAD_POLICY, messageForImageUploadError, type ImageUploadSource, type ImageUploadStage } from "@/lib/image-upload-policy";
import { safeUploadErrorMessage, safeUserMessage } from "@/lib/user-facing-errors";
import {
  findIntakeCategory,
  intakeCategories,
  intakeGroups,
  type IntakeGroupId,
  type WardrobeIntakeCategory
} from "@/lib/wardrobe/category-intelligence";
import type { WardrobeImageAsset, WardrobeImagePurpose } from "@/types/ai-tagging";
import type { TaggedSize } from "@/types/wardrobe";
import { resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";

type SlotFile = {
  id: string;
  file: File;
  previewUrl: string;
  width?: number;
  height?: number;
  original?: NormalizedImageUpload["original"];
  serverNormalizationRequired?: boolean;
  source: ImageUploadSource;
};

type UploadedSlot = WardrobeImageAsset & {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  thumbnailUrl: string;
};

type FileTarget = {
  purpose: WardrobeImagePurpose;
  multiple?: boolean;
  camera?: boolean;
};

type UploadEssentials = {
  primaryColor: string;
  taggedSize: TaggedSize;
  fit: string;
};

const draftKey = "myfitpick:wardrobe-intake-draft:v1";

const stylistPhotoGuide = [
  { title: "Front", body: "Full front view." },
  { title: "Back", body: "Full back view." }
];

const simplePhotoSlots: WardrobeImageSlotDefinition[] = [
  { key: "front", label: "Front view", helper: "Show the complete front", required: true },
  { key: "back", label: "Back view", helper: "Show the complete back" }
];

function toImageAsset(uploaded?: UploadedSlot): WardrobeImageAsset | undefined {
  if (!uploaded) return undefined;
  return {
    url: uploaded.url,
    storageKey: uploaded.storageKey,
    provider: uploaded.provider,
    uploadedAt: uploaded.uploadedAt,
    purpose: uploaded.purpose,
    variants: uploaded.variants
  };
}

function fileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
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

function uploadFailureMessage(error: unknown) {
  return safeUploadErrorMessage(imageUploadErrorMessage(error) || error, "We couldn’t upload this image. Try another photo.");
}

function selectedGroupCategories(groupId: IntakeGroupId | null) {
  if (!groupId) return [];
  return intakeCategories.filter((category) => category.group === groupId);
}

function selectClass(active = false) {
  return `focus-ring min-h-14 w-full appearance-none rounded-[1.35rem] border bg-white/85 px-4 py-3 pr-11 text-base font-semibold text-ink shadow-soft outline-none transition disabled:cursor-not-allowed disabled:opacity-55 ${active ? "border-cocoa/45" : "border-line hover:border-cocoa/30"}`;
}

const colorOptions = ["Black", "White", "Blue", "Brown", "Grey", "Green", "Red", "Pink", "Cream", "Beige"];
const fitOptions = ["Slim", "Regular", "Relaxed", "Oversized", "Not sure"];
const clothingSizeOptions: Array<{ value: TaggedSize; label: string }> = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "custom", label: "Custom" }
];
const oneSizeOptions: Array<{ value: TaggedSize; label: string }> = [];

const emptyEssentials: UploadEssentials = {
  primaryColor: "",
  taggedSize: "unknown",
  fit: ""
};

function normalizeEssentials(input: UploadEssentials) {
  return {
    primaryColor: input.primaryColor.trim(),
    taggedSize: input.taggedSize,
    fit: input.fit.trim()
  };
}

function autoItemName(category: WardrobeIntakeCategory, essentials: ReturnType<typeof normalizeEssentials>) {
  return [essentials.primaryColor, category.subcategory || category.title]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function garmentFitFromIntake(fit: string) {
  const normalized = fit.trim().toLowerCase().replace(/\s+/g, "_");
  if (["slim", "regular", "relaxed", "oversized"].includes(normalized)) return normalized;
  return "unknown";
}

function confirmedField(value: string | string[] | number | null) {
  return {
    value,
    confidence: 1,
    originalConfidence: 0,
    source: "user_confirmed" as const
  };
}

function autoConfirmPayload(category: WardrobeIntakeCategory, essentials: ReturnType<typeof normalizeEssentials>) {
  const garmentFit = garmentFitFromIntake(essentials.fit);
  const taxonomy = resolveCanonicalTaxonomy({ category: category.backendCategory, canonicalSubtype: category.canonicalSubtype, subcategory: category.subcategory });
  return {
    name: autoItemName(category, essentials) || category.title,
    category: category.backendCategory,
    subcategory: category.subcategory || category.title,
    canonicalSubtype: taxonomy.canonicalSubtype,
    structureRole: taxonomy.structureRole,
    stylingRole: taxonomy.stylingRole,
    setComponents: taxonomy.setComponents,
    visibilityRole: taxonomy.visibilityRole,
    formalityLevel: taxonomy.formalityLevel,
    taxonomyConfidence: taxonomy.needsReview ? taxonomy.confidence : 1,
    taxonomyEvidence: [`user-selection:${category.canonicalSubtype}`],
    taxonomyNeedsReview: taxonomy.needsReview,
    taxonomyVersion: taxonomy.taxonomyVersion,
    color: essentials.primaryColor,
    pattern: "",
    fabric: "",
    fit: essentials.fit,
    taggedSize: essentials.taggedSize || "unknown",
    sizeSystem: essentials.taggedSize === "unknown" ? "unknown" : "international",
    garmentFit,
    garmentMeasurements: {},
    stretchLevel: "unknown",
    fabricDrape: "unknown",
    fitConfidence: garmentFit === "unknown" ? 0 : 1,
    measurementSource: "user_confirmed",
    formality: [],
    occasions: [],
    weather: [],
    condition: "ready",
    verifiedFields: {
      category: confirmedField(category.backendCategory),
      subcategory: confirmedField(category.subcategory || category.title),
      garmentType: confirmedField(category.title),
      primaryColor: confirmedField(essentials.primaryColor),
      taggedSize: confirmedField(essentials.taggedSize || "unknown"),
      fit: confirmedField(essentials.fit),
      condition: confirmedField("ready")
    }
  };
}

export function WardrobeAddClient() {
  const session = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const essentialsSectionRef = useRef<HTMLElement>(null);
  const uploadSectionRef = useRef<HTMLElement>(null);
  const selectedPhotosRef = useRef<HTMLDivElement>(null);
  const revealContent = useRevealContent();
  const [selectedGroupId, setSelectedGroupId] = useState<IntakeGroupId | null>("clothing");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const selectedCategory = findIntakeCategory(selectedCategoryId);
  const [essentials, setEssentials] = useState<UploadEssentials>(emptyEssentials);
  const [activeTarget, setActiveTarget] = useState<FileTarget>({ purpose: "front" });
  const [slotFiles, setSlotFiles] = useState<Partial<Record<WardrobeImagePurpose, SlotFile>>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [draftNotice, setDraftNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<"idle" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploadStage, setUploadStage] = useState<ImageUploadStage>("selected");
  const [uploadStep, setUploadStep] = useState<"details" | "photos">("details");

  const groupOptions = intakeGroups;
  const categoryOptions = selectedGroupCategories(selectedGroupId);
  const sizeOptions = selectedCategory?.backendCategory === "bags" || selectedCategory?.backendCategory === "accessories" ? oneSizeOptions : clothingSizeOptions;
  const activeSlots = useMemo(() => selectedCategory ? simplePhotoSlots : [], [selectedCategory]);
  const requiredSlots = activeSlots.filter((slot) => slot.required);
  const slotImages = useMemo(() => localSlotAssets(slotFiles), [slotFiles]);
  const selectedCount = activeSlots.filter((slot) => slotFiles[slot.key]).length;
  const missingRequired = requiredSlots.filter((slot) => !slotFiles[slot.key]);
  const normalizedEssentials = useMemo(() => normalizeEssentials(essentials), [essentials]);
  const essentialsComplete = Boolean(
    selectedCategory &&
    normalizedEssentials.primaryColor &&
    (selectedCategory.backendCategory === "bags" || selectedCategory.backendCategory === "accessories" || normalizedEssentials.taggedSize !== "unknown") &&
    normalizedEssentials.fit
  );
  const isPreparingImage = ["validating", "preparing", "converting", "generating-preview"].includes(uploadStage) && !isSaving && !isAnalyzing;
  const canContinue = Boolean(selectedCategory && essentialsComplete && !missingRequired.length && !isSaving && !isAnalyzing && !isPreparingImage);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { selectedGroupId?: IntakeGroupId; selectedCategoryId?: string; essentials?: Partial<UploadEssentials> };
      if (draft.selectedGroupId) setSelectedGroupId(draft.selectedGroupId);
      if (draft.selectedCategoryId) setSelectedCategoryId(draft.selectedCategoryId);
      if (draft.essentials) setEssentials({ ...emptyEssentials, ...draft.essentials });
      setDraftNotice("Draft recovered. Add photos to continue.");
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ selectedGroupId, selectedCategoryId, essentials })
      );
    } catch {
      // Draft recovery is helpful, not required for upload safety.
    }
  }, [essentials, selectedCategoryId, selectedGroupId]);

  useEffect(() => {
    if (!selectedCategory) return;
    revealContent(essentialsSectionRef, { delayMs: 80, topOffset: 24, bottomOffset: 136 });
  }, [revealContent, selectedCategory]);

  useEffect(() => {
    if (!essentialsComplete) return;
    revealContent(uploadSectionRef, { delayMs: 160, topOffset: 24, bottomOffset: 136 });
  }, [essentialsComplete, revealContent]);

  function selectGroup(groupId: IntakeGroupId) {
    setSelectedGroupId(groupId);
    setSelectedCategoryId("");
    setEssentials(emptyEssentials);
    setUploadStep("details");
    setMessage("");
    setStatus("idle");
  }

  function selectGroupById(groupId: string) {
    if (!groupId) {
      setSelectedGroupId(null);
    setSelectedCategoryId("");
      setUploadStep("details");
      setMessage("");
      setStatus("idle");
      return;
    }
    selectGroup(groupId as IntakeGroupId);
  }

  function selectCategory(category: WardrobeIntakeCategory) {
    setSelectedGroupId(category.group);
    setSelectedCategoryId(category.id);
    setActiveTarget({ purpose: "front" });
    setEssentials((current) => ({
      ...current,
      taggedSize: category.backendCategory === "bags" || category.backendCategory === "accessories" ? "unknown" : current.taggedSize,
      fit: category.backendCategory === "bags" || category.backendCategory === "accessories" ? "Not sure" : current.fit
    }));
    setUploadStep("details");
    setMessage("");
    setStatus("idle");
  }

  function selectCategoryById(categoryId: string) {
    const category = findIntakeCategory(categoryId);
    if (!category) {
      setSelectedCategoryId("");
      return;
    }
    selectCategory(category);
  }

  function continueToPhotos() {
    if (!selectedCategory) return;
    if (!essentialsComplete) {
      revealContent(essentialsSectionRef, { delayMs: 40, topOffset: 24, bottomOffset: 136 });
      return;
    }
    setUploadStep("photos");
    revealContent(uploadSectionRef, { delayMs: 40, topOffset: 24, bottomOffset: 136 });
  }

  function updateEssential<K extends keyof UploadEssentials>(key: K, value: UploadEssentials[K]) {
    setEssentials((current) => ({ ...current, [key]: value }));
  }

  function openFilePicker(target: FileTarget) {
    if (!selectedCategory) {
      setMessage("Choose what you are adding first.");
      return;
    }
    setActiveTarget(target);
    fileInputRef.current?.click();
  }

  function sourceForTarget(target: FileTarget): ImageUploadSource {
    if (target.camera) return "camera";
    return target.multiple || target.purpose === "additional" ? "gallery" : "gallery";
  }

  async function normalizeSelectedFile(file: File, source: ImageUploadSource) {
    return await normalizeImageForUpload(file, {
      source,
      onStage: (stage) => {
        setUploadStage(stage);
        if (stage === "selected") setMessage("Photo selected. Preparing it for MyFitPick...");
        if (stage === "validating") setMessage("Checking photo...");
        if (stage === "preparing") setMessage("Preparing photo...");
        if (stage === "converting") setMessage("Preparing iPhone photo...");
        if (stage === "generating-preview") setMessage("Creating preview...");
      }
    });
  }

  async function handleSlotFile(purpose: WardrobeImagePurpose, file: File, source: ImageUploadSource) {
    const normalized = await normalizeSelectedFile(file, source);

    setSlotFiles((current) => {
      if (current[purpose]?.previewUrl) URL.revokeObjectURL(current[purpose]?.previewUrl || "");
      return {
        ...current,
        [purpose]: {
          id: fileId(normalized.file),
          file: normalized.file,
          previewUrl: normalized.previewUrl,
          width: normalized.width,
          height: normalized.height,
          original: normalized.original,
          serverNormalizationRequired: normalized.serverNormalizationRequired,
          source
        }
      };
    });
  }

  async function handleFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length) {
      setMessage(messageForImageUploadError("IMAGE_NOT_SELECTED"));
      setUploadStage("failed");
      return;
    }

    try {
      const source = sourceForTarget(activeTarget);
      await handleSlotFile(activeTarget.purpose, selected[0], source);

      setMessage("Photo ready.");
      setUploadStage("completed");
      setStatus("idle");
      revealContent(selectedPhotosRef, { delayMs: 90, topOffset: 24, bottomOffset: 136 });
    } catch (error) {
      setMessage(imageUploadErrorMessage(error));
      setUploadStage("failed");
      setStatus("idle");
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!selectedCategory) return;
    setActiveTarget({ purpose: "front" });
    void handleFiles(event.dataTransfer.files);
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
    const progressKey = `${purpose}:${slot.id}`;
    const mimeType = slot.file.type || IMAGE_UPLOAD_POLICY.acceptedOutputMimeType;
    setUploadStage("uploading");
    Sentry.addBreadcrumb({
      category: "wardrobe.image_upload",
      message: "wardrobe_image_upload_started",
      level: "info",
      data: {
        purpose,
        source: slot.source,
        mimeType,
        sizeBytes: slot.file.size,
        originalMimeType: slot.original?.mimeType,
        originalExtension: slot.original?.extension
      }
    });
    setUploadProgress((current) => ({ ...current, [progressKey]: 15 }));
    const dimensions = { width: slot.width, height: slot.height };

    const makeUploadedSlot = (input: { url: string; storageKey: string; provider?: string; filename?: string; mimeType?: string; sizeBytes?: number; width?: number; height?: number; original?: NonNullable<UploadedSlot["variants"]>["original"] }): UploadedSlot => ({
      url: input.url,
      storageKey: input.storageKey,
      provider: "s3",
      uploadedAt: new Date().toISOString(),
      purpose,
      filename: input.filename || slot.file.name,
      mimeType: input.mimeType || mimeType,
      sizeBytes: input.sizeBytes || slot.file.size,
      width: input.width || dimensions.width,
      height: input.height || dimensions.height,
      thumbnailUrl: input.url,
      ...(input.original ? { variants: { original: input.original } } : {})
    });

    // Wardrobe images use the server path so background removal cannot be bypassed by a direct S3 upload.
    const prepared = await uploadImageViaServer({ file: slot.file, purpose: `wardrobe_${purpose}` });
    if (prepared.ok) {
      const original = prepared.data.upload.original;
      setUploadProgress((current) => ({ ...current, [progressKey]: 100 }));
      return makeUploadedSlot({
        url: prepared.data.upload.publicUrl,
        storageKey: prepared.data.upload.storageKey,
        filename: prepared.data.upload.filename,
        mimeType: prepared.data.upload.mimeType,
        sizeBytes: prepared.data.upload.sizeBytes,
        width: prepared.data.upload.width,
        height: prepared.data.upload.height,
        original: original ? { url: original.publicUrl, storageKey: original.storageKey, provider: "s3", width: original.width, height: original.height, bytes: original.sizeBytes, status: "ready", processedAt: new Date().toISOString() } : undefined
      });
    }
    throw new Error(safeUploadErrorMessage(prepared.error, "We couldn’t upload this image. Try another photo."));

    if (slot.serverNormalizationRequired) {
      const fallback = await uploadImageViaServer({ file: slot.file, purpose: `wardrobe_${purpose}` });
      if (fallback.ok) {
        setUploadProgress((current) => ({ ...current, [progressKey]: 100 }));
        Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_completed", level: "info", data: { purpose, source: slot.source, fallback: true, normalizedOnServer: true } });
        return makeUploadedSlot({
          url: fallback.data.upload.publicUrl,
          storageKey: fallback.data.upload.storageKey,
          filename: fallback.data.upload.filename,
          mimeType: fallback.data.upload.mimeType,
          sizeBytes: fallback.data.upload.sizeBytes,
          width: fallback.data.upload.width,
          height: fallback.data.upload.height
        });
      }
      Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_failed", level: "error", data: { purpose, source: slot.source, reason: "server_normalization_failed" } });
      throw new Error(safeUploadErrorMessage(fallback.error, "We couldn’t upload this image. Try another photo."));
    }

    const signed = await requestSignedUploadUrl({
      filename: slot.file.name,
      mimeType,
      sizeBytes: slot.file.size,
      purpose: `wardrobe_${purpose}`
    });
    setUploadProgress((current) => ({ ...current, [progressKey]: 45 }));

    if (!signed.ok) {
      const fallback = await uploadImageViaServer({ file: slot.file, purpose: `wardrobe_${purpose}` });
      if (fallback.ok) {
        setUploadProgress((current) => ({ ...current, [progressKey]: 100 }));
        Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_completed", level: "info", data: { purpose, source: slot.source, fallback: true } });
        return makeUploadedSlot({
          url: fallback.data.upload.publicUrl,
          storageKey: fallback.data.upload.storageKey,
          filename: fallback.data.upload.filename,
          mimeType: fallback.data.upload.mimeType,
          sizeBytes: fallback.data.upload.sizeBytes,
          width: fallback.data.upload.width,
          height: fallback.data.upload.height
        });
      }
      Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_failed", level: "error", data: { purpose, source: slot.source, reason: "upload_access_failed" } });
      throw new Error(safeUploadErrorMessage(signed.error, safeUploadErrorMessage(fallback.error, "We couldn’t upload this image. Try another photo.")));
    }

    const uploadAccess = signed.data.upload;
    const uploadUrl = uploadAccess.uploadUrl;
    if (!uploadAccess.ready || !uploadUrl) {
      throw new Error(safeUploadErrorMessage(uploadAccess.message, "We couldn’t upload this image. Try another photo."));
    }

    try {
      setUploadProgress((current) => ({ ...current, [progressKey]: 72 }));
      const s3Response = await fetch(uploadUrl, {
        method: uploadAccess.method || "PUT",
        headers: uploadAccess.headers || { "content-type": mimeType },
        body: slot.file
      });

      if (!s3Response.ok) throw new Error("direct_upload_failed");

      const publicUrl = uploadAccess.publicUrl || uploadAccess.uploadUrl?.split("?")[0] || "";
      setUploadProgress((current) => ({ ...current, [progressKey]: 100 }));
      Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_completed", level: "info", data: { purpose, source: slot.source, fallback: false } });
      return makeUploadedSlot({ url: publicUrl, storageKey: uploadAccess.storageKey });
    } catch {
      const fallback = await uploadImageViaServer({ file: slot.file, purpose: `wardrobe_${purpose}` });
      if (fallback.ok) {
        setUploadProgress((current) => ({ ...current, [progressKey]: 100 }));
        Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_completed", level: "info", data: { purpose, source: slot.source, fallback: true } });
        return makeUploadedSlot({
          url: fallback.data.upload.publicUrl,
          storageKey: fallback.data.upload.storageKey,
          filename: fallback.data.upload.filename,
          mimeType: fallback.data.upload.mimeType,
          sizeBytes: fallback.data.upload.sizeBytes,
          width: fallback.data.upload.width,
          height: fallback.data.upload.height
        });
      }
      Sentry.addBreadcrumb({ category: "wardrobe.image_upload", message: "wardrobe_image_upload_failed", level: "error", data: { purpose, source: slot.source, reason: "direct_upload_failed" } });
      throw new Error(safeUploadErrorMessage(fallback.error, "We couldn’t upload this image. Try another photo."));
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

    if (!essentialsComplete) {
      setMessage("Add the essential styling details before uploading.");
      revealContent(essentialsSectionRef, { delayMs: 40, topOffset: 24, bottomOffset: 136 });
      return;
    }

    setIsSaving(true);
    setStatus("idle");
    setMessage("");
    setUploadStage("uploading");
    setUploadProgress({});

    try {
      const slotEntries = activeSlots
        .map((slot) => ({ purpose: slot.key, slot: slotFiles[slot.key] }))
        .filter((entry): entry is { purpose: WardrobeImagePurpose; slot: SlotFile } => Boolean(entry.slot));
      const uploaded = await Promise.all(slotEntries.map((entry) => uploadSlot(entry.purpose, entry.slot)));
      const standardUploads = uploaded.filter((asset) => asset.purpose !== "additional");
      const byPurpose = Object.fromEntries(standardUploads.map((asset) => [asset.purpose, asset])) as Partial<Record<WardrobeImagePurpose, UploadedSlot>>;
      const primary = byPurpose.front || uploaded[0];

      if (!primary) throw new Error("Add a main photo before continuing.");

      const labelKinds: string[] = [];
      const essentialsMetadata = {
        primaryColor: normalizedEssentials.primaryColor,
        fit: normalizedEssentials.fit,
        taggedSize: normalizedEssentials.taggedSize,
        formality: "",
        occasions: [],
        weather: [],
        fabric: "",
        material: "",
        size: "",
        brand: "",
        condition: "ready",
        source: "user_intake"
      };
      const result = await uploadWardrobeMetadata({
        filename: primary.filename,
        mimeType: primary.mimeType,
        sizeBytes: primary.sizeBytes,
        ...(primary.width ? { width: primary.width } : {}),
        ...(primary.height ? { height: primary.height } : {}),
        provider: "s3",
        storageKey: primary.storageKey,
        publicId: primary.storageKey,
        imageUrl: primary.url,
        secureUrl: primary.url,
        thumbnailUrl: primary.thumbnailUrl,
        uploadStatus: "uploaded",
        selectedCategory: selectedCategory.backendCategory,
        selectedCategoryLabel: selectedCategory.subcategory,
        intakeCategoryId: selectedCategory.id,
        intakeGroup: selectedCategory.group,
        labelPhotoKinds: labelKinds,
        userInputMetadata: {
          categoryGroup: selectedCategory.group,
          categoryId: selectedCategory.id,
          category: selectedCategory.backendCategory,
          subcategory: selectedCategory.subcategory,
          ...essentialsMetadata,
          photoGuidance: selectedCategory.guidance,
          labelIntelligenceRequested: false,
          labelPhotoKinds: labelKinds,
          primaryImagePurpose: "front",
          photoCount: uploaded.length
        },
        categorySpecificMetadata: {
          title: selectedCategory.title,
          canonicalSubtype: selectedCategory.canonicalSubtype,
          guidance: selectedCategory.guidance,
          visionFocus: selectedCategory.visionFocus,
          allowedMeasurementKeys: selectedCategory.allowedMeasurementKeys
        },
        recommendationMetadata: {
          outfitRoleHint: selectedCategory.backendCategory === "shoes" ? "footwear" : selectedCategory.backendCategory === "bags" || selectedCategory.backendCategory === "accessories" ? "finisher" : "garment",
          primaryColor: normalizedEssentials.primaryColor,
          formality: "",
          occasions: [],
          weather: [],
          fit: normalizedEssentials.fit,
          size: normalizedEssentials.taggedSize,
          material: ""
        },
        virtualTryOnMetadata: {
          eligibleHint: ["tops", "bottoms", "dresses", "native", "outerwear", "shoes"].includes(selectedCategory.backendCategory),
          primaryImagePurpose: "front",
          fit: normalizedEssentials.fit,
          size: normalizedEssentials.taggedSize
        },
        searchMetadata: {
          seedTerms: [
            selectedCategory.title,
            selectedCategory.subcategory,
            selectedCategory.backendCategory,
            normalizedEssentials.primaryColor,
            normalizedEssentials.fit,
            normalizedEssentials.taggedSize,
            ...selectedCategory.visionFocus
          ].filter(Boolean)
        },
        suggestedTags: {
          category: selectedCategory.backendCategory,
          subcategory: selectedCategory.subcategory,
          color: normalizedEssentials.primaryColor,
          primaryColor: normalizedEssentials.primaryColor,
          fit: normalizedEssentials.fit,
          formality: "",
          occasions: [],
          weather: [],
          fabric: "",
          size: normalizedEssentials.taggedSize,
          taggedSize: normalizedEssentials.taggedSize,
          brand: "",
          condition: "ready",
          intakeCategoryId: selectedCategory.id,
          intakeGroup: selectedCategory.group
        },
        images: {
          ...(toImageAsset(byPurpose.front) ? { front: toImageAsset(byPurpose.front) } : {}),
          ...(toImageAsset(byPurpose.back) ? { back: toImageAsset(byPurpose.back) } : {}),
          additional: []
        }
      });

      if (!result.ok) {
        setStatus("idle");
        setMessage(safeUserMessage(result.error, "We couldn’t upload this image. Try another photo."));
        return;
      }

      window.localStorage.removeItem(draftKey);
      setIsAnalyzing(true);
      setUploadStage("analyzing");
      const uploadId = result.data.upload.id;
      const analysis = await analyzeWardrobeUpload(uploadId);
      setIsAnalyzing(false);

      if (!analysis.ok) {
        setMessage("Your piece is saved with the details you added.");
      }

      setIsSaving(true);
      const saveResult = await confirmWardrobeUploadTags(uploadId, autoConfirmPayload(selectedCategory, normalizedEssentials));
      setIsSaving(false);

      if (!saveResult.ok) {
        setStatus(saveResult.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
        setMessage(safeUserMessage(saveResult.error, "We couldn’t save this piece. Please try again."));
        return;
      }

      setUploadStage("completed");
      router.push(`/wardrobe/${saveResult.data.item.id}`);
    } catch (error) {
      setIsSaving(false);
      setIsAnalyzing(false);
      setStatus("idle");
      setUploadStage("failed");
      setMessage(uploadFailureMessage(error));
    }
  }

  if (session.status === "loading") return <WardrobeLoadingState />;
  if (session.status === "logged-out") return <WardrobeAuthRequiredState />;
  if (session.status === "backend-unavailable") return <WardrobeBackendUnavailableState onRetry={session.refresh} />;

  return (
    <div className="mt-4 space-y-6">
      {status === "unavailable" ? <WardrobeBackendUnavailableState /> : null}
      {status === "error" ? <WardrobeApiErrorState /> : null}

      {draftNotice ? (
        <p className="rounded-2xl border border-cocoa/20 bg-cocoa/10 px-4 py-3 text-xs font-semibold leading-5 text-ink">
          {draftNotice}
        </p>
      ) : null}

      {uploadStep === "details" ? (
        <section ref={essentialsSectionRef} className="mx-auto max-w-[560px]">
          <Card className="border-cocoa/15 bg-surface/90 p-6 shadow-card sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">1 of 2</p>
                <h2 className="font-editorial text-4xl font-semibold leading-none text-ink">Tell your stylist what this is</h2>
                <p className="mt-3 text-sm leading-6 text-muted">Five quick details are all we need.</p>
              </div>
              <Badge tone={essentialsComplete ? "success" : "warning"}>{essentialsComplete ? "Ready" : "Required"}</Badge>
            </div>

            <div className="mt-7 space-y-4">
              <div>
                <label htmlFor="wardrobe-intake-group" className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Category *</label>
                <div className="relative mt-2">
                  <select
                    id="wardrobe-intake-group"
                    aria-label="Wardrobe category"
                    className={selectClass(Boolean(selectedGroupId))}
                    value={selectedGroupId || ""}
                    onChange={(event) => selectGroupById(event.target.value)}
                    disabled={isSaving || isAnalyzing}
                  >
                    <option value="">Select category</option>
                    {groupOptions.map((group) => (
                      <option key={group.id} value={group.id}>{group.title}</option>
                    ))}
                  </select>
                  <ChevronRight size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-cocoa" aria-hidden="true" />
                </div>
              </div>

              <div>
                <label htmlFor="wardrobe-intake-subtype" className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Subtype *</label>
                <div className="relative mt-2">
                  <select
                    id="wardrobe-intake-subtype"
                    aria-label="Wardrobe subtype"
                    className={selectClass(Boolean(selectedCategoryId))}
                    value={selectedCategoryId}
                    onChange={(event) => selectCategoryById(event.target.value)}
                    disabled={!selectedGroupId || isSaving || isAnalyzing}
                  >
                    <option value="">{selectedGroupId ? "Select subtype" : "Choose category first"}</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.title}</option>
                    ))}
                  </select>
                  <ChevronRight size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-cocoa" aria-hidden="true" />
                </div>
              </div>

              <div>
                <label htmlFor="wardrobe-essential-color" className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Primary colour *</label>
                <input
                  id="wardrobe-essential-color"
                  className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-line bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none placeholder:text-muted"
                  value={essentials.primaryColor}
                  onChange={(event) => updateEssential("primaryColor", event.target.value)}
                  placeholder="e.g. Black, navy, cream"
                  disabled={isSaving || isAnalyzing}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`focus-ring rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${essentials.primaryColor.toLowerCase() === color.toLowerCase() ? "border-cocoa bg-cocoa text-canvas" : "border-line bg-white/70 text-muted hover:border-cocoa/35 hover:text-ink"}`}
                      onClick={() => updateEssential("primaryColor", color)}
                      disabled={isSaving || isAnalyzing}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="wardrobe-essential-size" className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Size *</label>
                  <div className="relative mt-2">
                    <select
                      id="wardrobe-essential-size"
                      className={selectClass(Boolean(essentials.taggedSize))}
                      value={essentials.taggedSize}
                      onChange={(event) => updateEssential("taggedSize", event.target.value as TaggedSize)}
                      disabled={!selectedCategory || isSaving || isAnalyzing}
                    >
                      <option value="unknown">
                        {selectedCategory?.backendCategory === "bags" || selectedCategory?.backendCategory === "accessories" ? "One size / not applicable" : selectedCategory ? "Select size" : "Choose subtype first"}
                      </option>
                      {sizeOptions.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
                    </select>
                    <ChevronRight size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-cocoa" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <label htmlFor="wardrobe-essential-fit" className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Fit *</label>
                  <div className="relative mt-2">
                    <select
                      id="wardrobe-essential-fit"
                      className={selectClass(Boolean(essentials.fit))}
                      value={essentials.fit}
                      onChange={(event) => updateEssential("fit", event.target.value)}
                      disabled={!selectedCategory || isSaving || isAnalyzing}
                    >
                      <option value="">Select fit</option>
                      {fitOptions.map((fit) => <option key={fit} value={fit}>{fit}</option>)}
                    </select>
                    <ChevronRight size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-cocoa" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end">
              <Button type="button" className="w-full rounded-full sm:w-auto" onClick={continueToPhotos} disabled={!essentialsComplete || isSaving || isAnalyzing}>
                Continue to photos
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      {uploadStep === "photos" && selectedCategory ? (
        <section ref={uploadSectionRef} className="mx-auto max-w-[680px]">
          <Card className="space-y-5 overflow-hidden p-5 shadow-card sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cocoa">
                  <ImagePlus size={14} aria-hidden="true" />
                  2 of 2
                </p>
                <h2 className="font-editorial mt-1 text-3xl font-semibold leading-none text-ink">Add clear item photos</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Use a full front and back view.</p>
              </div>
              <Badge tone={!missingRequired.length ? "success" : "warning"}>{selectedCount} added</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stylistPhotoGuide.map((guide) => (
                <div key={guide.title} className="rounded-2xl border border-line bg-canvas/60 p-3">
                  <p className="text-xs font-bold text-ink">{guide.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{guide.body}</p>
                </div>
              ))}
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="rounded-[1.5rem] border border-dashed border-cocoa/25 bg-canvas/60 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                    <UploadCloud size={17} className="text-cocoa" aria-hidden="true" />
                    Add the front photo first
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">You can take a new photo or choose one from your gallery.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => openFilePicker({ purpose: "front", camera: true })} disabled={isSaving || isAnalyzing || isPreparingImage}>
                    <Camera size={15} aria-hidden="true" />
                    Camera
                  </Button>
                  <Button type="button" className="rounded-full" onClick={() => openFilePicker({ purpose: "front" })} disabled={isSaving || isAnalyzing || isPreparingImage}>
                    Gallery
                  </Button>
                </div>
              </div>
            </div>

            <WardrobeImageSlots images={slotImages} onSelect={(purpose) => openFilePicker({ purpose })} disabled={isSaving || isAnalyzing || isPreparingImage} slots={activeSlots as WardrobeImageSlotDefinition[]} />

            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept={IMAGE_UPLOAD_POLICY.acceptAttribute}
              multiple={false}
              capture={activeTarget.camera ? "environment" : undefined}
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                event.currentTarget.value = "";
                if (selected.length) void handleFiles(selected);
              }}
            />

            <div ref={selectedPhotosRef} className="space-y-3">
              {activeSlots.map((slot) => {
                const selected = slotFiles[slot.key];
                if (!selected) return null;
                const progress = uploadProgress[`${slot.key}:${selected.id}`];
                return (
                  <div key={slot.key} className="rounded-2xl border border-line bg-canvas/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">{slot.label}{slot.required ? " · Required" : " · Optional"}</p>
                        <p className="mt-1 break-words text-[11px] leading-4 text-muted">{selected.file.name}</p>
                      </div>
                      {progress ? <Badge tone={progress >= 100 ? "success" : "warning"}>{progress >= 100 ? "Uploaded" : `${progress}%`}</Badge> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => openFilePicker({ purpose: slot.key })} disabled={isSaving || isAnalyzing || isPreparingImage}>
                        Replace
                      </Button>
                      <Button type="button" variant="ghost" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => removeSlot(slot.key)} disabled={!selected || isSaving || isAnalyzing || isPreparingImage}>
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-[calc(5.5rem+var(--safe-bottom))] z-10 -mx-1 rounded-[1.5rem] border border-line bg-surface/95 p-2 shadow-glow backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <Button type="button" className="w-full rounded-full" onClick={() => void handlePhotoUpload()} disabled={!canContinue}>
                {isSaving || isAnalyzing || isPreparingImage ? <Sparkles size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                {isPreparingImage ? "Preparing photo..." : isSaving || isAnalyzing ? "Adding to your wardrobe..." : message && /couldn’t|could not|too large|try again|icloud/i.test(message) ? "Retry upload" : "Upload item"}
              </Button>
              {message ? (
                <p className="mt-3 inline-flex items-start gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-ink">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                  {message}
                </p>
              ) : null}
              <button type="button" className="focus-ring mt-3 w-full rounded-full px-4 py-2 text-sm font-semibold text-cocoa" onClick={() => setUploadStep("details")} disabled={isSaving || isAnalyzing}>
                Back to details
              </button>
            </div>
          </Card>
        </section>
      ) : null}

      <Link href="/wardrobe" className="block pb-3 text-center text-sm font-semibold text-cocoa">
        Back to closet
      </Link>
    </div>
  );
}
