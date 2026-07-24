"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Images,
  PencilLine,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud
} from "lucide-react";
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
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import {
  analyzeWardrobeUpload,
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
  labelPhotoKinds,
  type IntakeGroupId,
  type LabelPhotoKind,
  type WardrobeIntakeCategory
} from "@/lib/wardrobe/category-intelligence";
import type { WardrobeImageAsset, WardrobeImagePurpose } from "@/types/ai-tagging";

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

const draftKey = "myfitpick:wardrobe-intake-draft:v1";

const stylistPhotoGuide = [
  { title: "Main/front", body: "A clear full view anchors the item." },
  { title: "Back or side", body: "Extra angles improve shape and structure." },
  { title: "Fabric/detail", body: "Texture, pattern, and hardware help styling." },
  { title: "Label", body: "Size, brand, material, and care details improve accuracy." }
];

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
  return safeUploadErrorMessage(imageUploadErrorMessage(error) || error, "We could not upload these photos. Try again.");
}

function selectedGroupCategories(groupId: IntakeGroupId | null) {
  if (!groupId) return [];
  return intakeCategories.filter((category) => category.group === groupId);
}

function selectClass(active = false) {
  return `focus-ring min-h-14 w-full appearance-none rounded-[1.35rem] border bg-white/85 px-4 py-3 pr-11 text-base font-semibold text-ink shadow-soft outline-none transition disabled:cursor-not-allowed disabled:opacity-55 ${active ? "border-cocoa/45" : "border-line hover:border-cocoa/30"}`;
}

export function WardrobeAddClient() {
  const session = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLElement>(null);
  const selectedPhotosRef = useRef<HTMLDivElement>(null);
  const labelSectionRef = useRef<HTMLElement>(null);
  const revealContent = useRevealContent();
  const [selectedGroupId, setSelectedGroupId] = useState<IntakeGroupId | null>("clothing");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const selectedCategory = findIntakeCategory(selectedCategoryId);
  const [activeTarget, setActiveTarget] = useState<FileTarget>({ purpose: "front" });
  const [slotFiles, setSlotFiles] = useState<Partial<Record<WardrobeImagePurpose, SlotFile>>>({});
  const [additionalFiles, setAdditionalFiles] = useState<SlotFile[]>([]);
  const [labelEnabled, setLabelEnabled] = useState(true);
  const [selectedLabelKinds, setSelectedLabelKinds] = useState<LabelPhotoKind[]>(["care_label", "brand_label", "size_tag"]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [draftNotice, setDraftNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<"idle" | "unavailable" | "error">("idle");
  const [message, setMessage] = useState("");
  const [uploadStage, setUploadStage] = useState<ImageUploadStage>("selected");

  const groupOptions = intakeGroups;
  const selectedGroup = groupOptions.find((group) => group.id === selectedGroupId);
  const categoryOptions = selectedGroupCategories(selectedGroupId);
  const activeSlots = useMemo(() => {
    const slots = selectedCategory?.slots || [];
    return labelEnabled ? slots : slots.filter((slot) => slot.key !== "label");
  }, [labelEnabled, selectedCategory]);
  const requiredSlots = activeSlots.filter((slot) => slot.required);
  const slotImages = useMemo(() => localSlotAssets(slotFiles), [slotFiles]);
  const selectedCount = activeSlots.filter((slot) => slotFiles[slot.key]).length + additionalFiles.length;
  const missingRequired = requiredSlots.filter((slot) => !slotFiles[slot.key]);
  const isPreparingImage = ["validating", "preparing", "converting", "generating-preview"].includes(uploadStage) && !isSaving && !isAnalyzing;
  const canContinue = Boolean(selectedCategory && !missingRequired.length && !isSaving && !isAnalyzing && !isPreparingImage);
  const uploadSteps = [
    { label: "Choose category", status: selectedCategory ? "complete" : "current" },
    { label: "Add photos", status: selectedCategory && !missingRequired.length ? "complete" : selectedCategory ? "current" : "pending" },
    { label: "Review details", status: isAnalyzing ? "current" : "pending" }
  ] as const;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { selectedGroupId?: IntakeGroupId; selectedCategoryId?: string; labelEnabled?: boolean; selectedLabelKinds?: LabelPhotoKind[] };
      if (draft.selectedGroupId) setSelectedGroupId(draft.selectedGroupId);
      if (draft.selectedCategoryId) setSelectedCategoryId(draft.selectedCategoryId);
      if (typeof draft.labelEnabled === "boolean") setLabelEnabled(draft.labelEnabled);
      if (Array.isArray(draft.selectedLabelKinds) && draft.selectedLabelKinds.length) setSelectedLabelKinds(draft.selectedLabelKinds);
      setDraftNotice("Draft recovered. Add photos to continue.");
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        draftKey,
        JSON.stringify({ selectedGroupId, selectedCategoryId, labelEnabled, selectedLabelKinds })
      );
    } catch {
      // Draft recovery is helpful, not required for upload safety.
    }
  }, [labelEnabled, selectedCategoryId, selectedGroupId, selectedLabelKinds]);

  function selectGroup(groupId: IntakeGroupId) {
    setSelectedGroupId(groupId);
    setSelectedCategoryId("");
    setMessage("");
    setStatus("idle");
  }

  function selectGroupById(groupId: string) {
    if (!groupId) {
      setSelectedGroupId(null);
      setSelectedCategoryId("");
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
    revealContent(uploadSectionRef, { delayMs: 40, topOffset: 24, bottomOffset: 136 });
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
        if (stage === "validating") setMessage("Checking photo format...");
        if (stage === "preparing") setMessage("Preparing photo...");
        if (stage === "converting") setMessage("Converting iPhone photo for upload...");
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

  async function handleAdditionalFiles(files: File[], source: ImageUploadSource) {
    const nextFiles: SlotFile[] = [];
    for (const file of files) {
      const normalized = await normalizeSelectedFile(file, source);
      nextFiles.push({
        id: fileId(normalized.file),
        file: normalized.file,
        previewUrl: normalized.previewUrl,
        width: normalized.width,
        height: normalized.height,
        original: normalized.original,
        serverNormalizationRequired: normalized.serverNormalizationRequired,
        source
      });
    }

    setAdditionalFiles((current) => [...current, ...nextFiles].slice(0, 8));
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
      if (activeTarget.multiple || activeTarget.purpose === "additional") {
        const [first, ...rest] = selected;
        if (first && !slotFiles.front) await handleSlotFile("front", first, source);
        if (rest.length) await handleAdditionalFiles(rest, source);
        if (first && slotFiles.front) await handleAdditionalFiles(selected, source);
      } else {
        await handleSlotFile(activeTarget.purpose, selected[0], source);
      }

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
    setActiveTarget({ purpose: "additional", multiple: true });
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

  function removeAdditional(id: string) {
    setAdditionalFiles((current) => {
      const match = current.find((file) => file.id === id);
      if (match?.previewUrl) URL.revokeObjectURL(match.previewUrl);
      return current.filter((file) => file.id !== id);
    });
  }

  function moveAdditional(id: string, direction: -1 | 1) {
    setAdditionalFiles((current) => {
      const index = current.findIndex((file) => file.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function makePrimaryFromAdditional(id: string) {
    const selected = additionalFiles.find((file) => file.id === id);
    if (!selected) return;
    const previousFront = slotFiles.front;
    setSlotFiles((current) => ({ ...current, front: selected }));
    setAdditionalFiles((current) => {
      const rest = current.filter((file) => file.id !== id);
      return previousFront ? [previousFront, ...rest].slice(0, 8) : rest;
    });
  }

  function toggleLabelKind(kind: LabelPhotoKind) {
    setSelectedLabelKinds((current) => {
      if (current.includes(kind)) return current.filter((item) => item !== kind);
      return [...current, kind].slice(0, 7);
    });
  }

  function toggleLabelReading() {
    const next = !labelEnabled;
    setLabelEnabled(next);
    revealContent(next ? uploadSectionRef : labelSectionRef, { delayMs: next ? 120 : 80, topOffset: 24, bottomOffset: 136 });
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

    const makeUploadedSlot = (input: { url: string; storageKey: string; provider?: string; filename?: string; mimeType?: string; sizeBytes?: number; width?: number; height?: number }): UploadedSlot => ({
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
      thumbnailUrl: input.url
    });

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
      throw new Error(safeUploadErrorMessage(fallback.error, "We could not upload these photos. Try again."));
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
      throw new Error(safeUploadErrorMessage(signed.error, safeUploadErrorMessage(fallback.error, "We could not upload these photos. Try again.")));
    }

    const uploadAccess = signed.data.upload;
    const uploadUrl = uploadAccess.uploadUrl;
    if (!uploadAccess.ready || !uploadUrl) {
      throw new Error(safeUploadErrorMessage(uploadAccess.message, "We could not upload these photos. Try again."));
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
      throw new Error(safeUploadErrorMessage(fallback.error, "We could not upload these photos. Try again."));
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
    setUploadStage("uploading");
    setUploadProgress({});

    try {
      const slotEntries = activeSlots
        .map((slot) => ({ purpose: slot.key, slot: slotFiles[slot.key] }))
        .filter((entry): entry is { purpose: WardrobeImagePurpose; slot: SlotFile } => Boolean(entry.slot));
      const additionalEntries = additionalFiles.map((slot) => ({ purpose: "additional" as const, slot }));
      const uploaded = await Promise.all([...slotEntries, ...additionalEntries].map((entry) => uploadSlot(entry.purpose, entry.slot)));
      const standardUploads = uploaded.filter((asset) => asset.purpose !== "additional");
      const additionalUploads = uploaded.filter((asset) => asset.purpose === "additional");
      const byPurpose = Object.fromEntries(standardUploads.map((asset) => [asset.purpose, asset])) as Partial<Record<WardrobeImagePurpose, UploadedSlot>>;
      const primary = byPurpose.front || uploaded[0];

      if (!primary) throw new Error("Add a main photo before continuing.");

      const labelKinds = labelEnabled ? selectedLabelKinds : [];
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
          photoGuidance: selectedCategory.guidance,
          labelIntelligenceRequested: labelEnabled,
          labelPhotoKinds: labelKinds,
          primaryImagePurpose: "front",
          photoCount: uploaded.length
        },
        categorySpecificMetadata: {
          title: selectedCategory.title,
          guidance: selectedCategory.guidance,
          visionFocus: selectedCategory.visionFocus,
          allowedMeasurementKeys: selectedCategory.allowedMeasurementKeys
        },
        recommendationMetadata: {
          outfitRoleHint: selectedCategory.backendCategory === "shoes" ? "footwear" : selectedCategory.backendCategory === "bags" || selectedCategory.backendCategory === "accessories" ? "finisher" : "garment"
        },
        virtualTryOnMetadata: {
          eligibleHint: ["tops", "bottoms", "dresses", "outerwear", "shoes"].includes(selectedCategory.backendCategory),
          primaryImagePurpose: "front"
        },
        searchMetadata: {
          seedTerms: [selectedCategory.title, selectedCategory.subcategory, selectedCategory.backendCategory, ...selectedCategory.visionFocus]
        },
        suggestedTags: {
          category: selectedCategory.backendCategory,
          subcategory: selectedCategory.subcategory,
          intakeCategoryId: selectedCategory.id,
          intakeGroup: selectedCategory.group
        },
        images: {
          ...(toImageAsset(byPurpose.front) ? { front: toImageAsset(byPurpose.front) } : {}),
          ...(toImageAsset(byPurpose.back) ? { back: toImageAsset(byPurpose.back) } : {}),
          ...(toImageAsset(byPurpose.fabricCloseUp) ? { fabricCloseUp: toImageAsset(byPurpose.fabricCloseUp) } : {}),
          ...(labelEnabled && toImageAsset(byPurpose.label) ? { label: toImageAsset(byPurpose.label) } : {}),
          additional: additionalUploads.map((asset) => toImageAsset(asset)).filter(Boolean)
        }
      });

      if (!result.ok) {
        setStatus("idle");
        setMessage(safeUserMessage(result.error, "MyFitPick could not save the upload. Try again."));
        return;
      }

      window.localStorage.removeItem(draftKey);
      setIsSaving(false);
      setIsAnalyzing(true);
      setUploadStage("analyzing");
      const analysis = await analyzeWardrobeUpload(result.data.upload.id);
      setIsAnalyzing(false);

      if (!analysis.ok) {
        setMessage("Upload saved, but the detail check did not finish. You can review the item on the next screen.");
      }

      setUploadStage("completed");

      router.push(`/wardrobe/${result.data.upload.id}/confirm`);
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

      <section className="mx-auto max-w-[520px]">
        <Card className="border-cocoa/15 bg-gradient-to-br from-white via-surface to-cocoa/5 p-5 shadow-card sm:p-6">
          <div>
            <h2 className="font-editorial text-3xl font-semibold leading-none text-ink">Add to Wardrobe</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Tell me what you&apos;re adding.</p>
          </div>

          <div className="mt-6 space-y-4">
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

            <div className="transition duration-200 ease-out">
              <label htmlFor="wardrobe-intake-subtype" className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Subtype *</label>
              <div className="relative mt-2">
                <select
                  id="wardrobe-intake-subtype"
                  aria-label="Wardrobe subtype"
                  aria-describedby="wardrobe-intake-help"
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
          </div>

          <div id="wardrobe-intake-help" className="sr-only">
            {selectedCategory ? (
              <div>
                <p className="text-sm font-semibold text-ink">{selectedGroup?.title} · {selectedCategory.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{selectedCategory.description}</p>
              </div>
            ) : selectedGroup ? (
              <p className="text-xs leading-5 text-muted">Now choose the subtype that best matches the item.</p>
            ) : (
              <p className="text-xs leading-5 text-muted">Start with one simple choice. Clothing, shoes, bags, and accessories each unlock their own photo guidance.</p>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Stylist priority</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Shoes, bottoms, outerwear, and versatile basics make outfit recommendations stronger as your closet grows.
            </p>
          </div>

          <div className="sticky bottom-[calc(5.5rem+var(--safe-bottom))] z-10 -mx-2 mt-6 flex justify-end rounded-[1.5rem] border border-line bg-surface/95 p-2 shadow-glow backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <Button type="button" className="w-full rounded-full sm:w-auto" onClick={continueToPhotos} disabled={!selectedCategory || isSaving || isAnalyzing}>
              Continue
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </Card>
      </section>

      <section ref={uploadSectionRef}>
        <Card className="space-y-5 overflow-hidden p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cocoa">
                <ImagePlus size={14} aria-hidden="true" />
                Step 2
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-ink">Upload photos</h2>
              <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
                Add a clear main photo. Extra angles help MyFitPick understand shape, material, styling, and future try-on quality.
              </p>
            </div>
            <Badge tone={selectedCategory && !missingRequired.length ? "success" : "warning"}>
              {selectedCategory ? `${selectedCount} added` : "Pick category"}
            </Badge>
          </div>

          <div className="hidden sm:block">
            <ProgressSteps steps={[...uploadSteps]} />
          </div>

          {selectedCategory ? (
            <div className="rounded-2xl border border-line bg-canvas/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Photo guide</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Add front, back, fabric/detail, and label photos when you have them. The main photo is required; the rest make styling and try-on smarter.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {stylistPhotoGuide.map((guide) => (
                  <div key={guide.title} className="rounded-2xl border border-line bg-white/70 p-3">
                    <p className="text-xs font-bold text-ink">{guide.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-muted">{guide.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCategory.guidance.map((guide) => <Badge key={guide} tone="neutral">{guide}</Badge>)}
              </div>
            </div>
          ) : null}

          {selectedCategory ? (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="rounded-[1.75rem] border border-dashed border-cocoa/30 bg-gradient-to-br from-cocoa/8 via-white/70 to-olive/10 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                    <UploadCloud size={17} className="text-cocoa" aria-hidden="true" />
                    Camera, gallery, or drag and drop
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">You can upload photos you already have. MyFitPick will organize them before review.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => openFilePicker({ purpose: "front", camera: true })} disabled={isSaving || isAnalyzing || isPreparingImage}>
                    <Camera size={15} aria-hidden="true" />
                    Camera
                  </Button>
                  <Button type="button" className="rounded-full" onClick={() => openFilePicker({ purpose: "additional", multiple: true })} disabled={isSaving || isAnalyzing || isPreparingImage}>
                    <Images size={15} aria-hidden="true" />
                    Gallery
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {selectedCategory ? (
            <WardrobeImageSlots images={slotImages} onSelect={(purpose) => openFilePicker({ purpose })} disabled={isSaving || isAnalyzing || isPreparingImage} slots={activeSlots as WardrobeImageSlotDefinition[]} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-canvas/60 px-4 py-8 text-center text-sm font-semibold text-muted">
              Choose a category to see the right photo slots.
            </div>
          )}

          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept={IMAGE_UPLOAD_POLICY.acceptAttribute}
            multiple={Boolean(activeTarget.multiple)}
            capture={activeTarget.camera ? "environment" : undefined}
            onChange={(event) => {
              const selected = Array.from(event.target.files || []);
              event.currentTarget.value = "";
              if (selected.length) void handleFiles(selected);
            }}
          />

          {selectedCategory ? (
            <div ref={selectedPhotosRef} className="space-y-3">
              {activeSlots.map((slot) => {
                const selected = slotFiles[slot.key];
                if (!selected) return null;
                const progress = uploadProgress[`${slot.key}:${selected.id}`];
                return (
                  <div key={slot.key} className="rounded-2xl border border-line bg-canvas/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">{slot.label}{slot.key === "front" ? " · Primary" : ""}</p>
                        <p className="mt-1 break-words text-[11px] leading-4 text-muted">{selected.file.name}</p>
                      </div>
                      {progress ? <Badge tone={progress >= 100 ? "success" : "warning"}>{progress >= 100 ? "Uploaded" : `${progress}%`}</Badge> : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => openFilePicker({ purpose: slot.key })} disabled={isSaving || isAnalyzing || isPreparingImage}>
                        <PencilLine size={13} aria-hidden="true" />
                        Replace
                      </Button>
                      <Button type="button" variant="ghost" className="min-h-9 rounded-xl px-2 py-2 text-[11px]" onClick={() => removeSlot(slot.key)} disabled={!selected || isSaving || isAnalyzing || isPreparingImage}>
                        Clear
                      </Button>
                    </div>
                  </div>
                );
              })}

              {additionalFiles.length ? (
                <div className="rounded-2xl border border-line bg-canvas/60 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Extra photos</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {additionalFiles.map((file, index) => {
                      const progress = uploadProgress[`additional:${file.id}`];
                      return (
                        <div key={file.id} className="flex items-center gap-3 rounded-2xl bg-white/70 p-2">
                          <div className="size-16 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${file.previewUrl})` }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-ink">{file.file.name}</p>
                            <p className="text-[11px] text-muted">Extra angle {index + 1}{progress ? ` · ${progress >= 100 ? "Uploaded" : `${progress}%`}` : ""}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <button type="button" className="focus-ring rounded-full px-2 py-1 text-[11px] font-bold text-cocoa" onClick={() => makePrimaryFromAdditional(file.id)} disabled={isSaving || isAnalyzing}>Make primary</button>
                              <button type="button" className="focus-ring rounded-full px-2 py-1 text-[11px] font-bold text-muted" onClick={() => moveAdditional(file.id, -1)} disabled={index === 0 || isSaving || isAnalyzing} aria-label="Move photo up"><ArrowUp size={12} /></button>
                              <button type="button" className="focus-ring rounded-full px-2 py-1 text-[11px] font-bold text-muted" onClick={() => moveAdditional(file.id, 1)} disabled={index === additionalFiles.length - 1 || isSaving || isAnalyzing} aria-label="Move photo down"><ArrowDown size={12} /></button>
                              <button type="button" className="focus-ring rounded-full px-2 py-1 text-[11px] font-bold text-danger" onClick={() => removeAdditional(file.id)} disabled={isSaving || isAnalyzing} aria-label="Delete photo"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </section>

      {selectedCategory ? (
        <section ref={labelSectionRef}>
          <Card className="space-y-4 border-cocoa/15 bg-gradient-to-br from-white via-canvas to-cocoa/8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cocoa">
                  <Tag size={14} aria-hidden="true" />
                  Recommended label intelligence
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-ink">Would you like MyFitPick to read the item label?</h2>
                <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
                  This helps identify materials, care instructions, size, product details, serials, and manufacturing text automatically.
                </p>
              </div>
              <Button type="button" variant={labelEnabled ? "primary" : "secondary"} className="rounded-full" onClick={toggleLabelReading} disabled={isSaving || isAnalyzing}>
                {labelEnabled ? "Label reading on" : "Add label slot"}
              </Button>
            </div>

            {labelEnabled ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {labelPhotoKinds.map((kind) => (
                    <button
                      key={kind.id}
                      type="button"
                      title={kind.helper}
                      onClick={() => toggleLabelKind(kind.id)}
                      className={`focus-ring rounded-full border px-3 py-2 text-xs font-bold transition ${selectedLabelKinds.includes(kind.id) ? "border-cocoa bg-cocoa text-canvas" : "border-line bg-white text-muted hover:text-ink"}`}
                    >
                      {kind.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs leading-5 text-muted">Use the Label slot above for the clearest label photo. Extra label photos can be added as extra photos.</p>
              </div>
            ) : null}
          </Card>
        </section>
      ) : null}

      <section className="sticky bottom-[calc(5.5rem+var(--safe-bottom))] z-10 rounded-[1.75rem] border border-line bg-surface/90 p-3 shadow-glow backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:shadow-none">
        <Button type="button" className="w-full rounded-full" onClick={() => void handlePhotoUpload()} disabled={!canContinue}>
          {isSaving || isAnalyzing || isPreparingImage ? <Sparkles size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          {isPreparingImage ? "Preparing photo..." : isSaving ? "Uploading photos..." : isAnalyzing ? "Building garment intelligence..." : message && /could not|too large|try again|icloud/i.test(message) ? "Retry upload" : "Upload and review details"}
        </Button>
        {message ? (
          <p className="mt-3 inline-flex items-start gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold leading-5 text-ink">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            {message}
          </p>
        ) : null}
      </section>

      <Link href="/wardrobe" className="block pb-3 text-center text-sm font-semibold text-cocoa">
        Back to closet
      </Link>
    </div>
  );
}
