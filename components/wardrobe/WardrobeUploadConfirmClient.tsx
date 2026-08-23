"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeLoadingState,
  WardrobeSaveSuccessState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { AITagConfirmationForm, type AITagConfirmationDefaults, type AITagConfirmationValues } from "@/components/wardrobe/AITagConfirmationForm";
import { canonicalizeDetectedSubtype } from "@/lib/wardrobe/canonical-taxonomy";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import { analyzeWardrobeUpload, confirmWardrobeUploadTags, getJobStatus, getWardrobeUpload, type WardrobeUploadRecord } from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";
import type { WardrobeCategory, WardrobeItem } from "@/types/wardrobe";

function cleanItemPayload(values: AITagConfirmationValues) {
  return {
    name: values.name,
    category: values.category,
    subcategory: values.subcategory || "",
    canonicalSubtype: values.canonicalSubtype,
    structureRole: values.structureRole,
    stylingRole: values.stylingRole,
    setComponents: values.setComponents,
    visibilityRole: values.visibilityRole,
    formalityLevel: values.formalityLevel,
    taxonomyConfidence: values.taxonomyConfidence,
    taxonomyEvidence: values.taxonomyEvidence,
    taxonomyNeedsReview: values.taxonomyNeedsReview,
    taxonomyVersion: values.taxonomyVersion,
    color: values.color,
    pattern: values.pattern || "",
    fabric: values.fabric || "",
    fit: values.fit || "",
    taggedSize: values.taggedSize,
    sizeSystem: values.sizeSystem,
    garmentFit: values.garmentFit,
    garmentMeasurements: values.garmentMeasurements,
    stretchLevel: values.stretchLevel,
    fabricDrape: values.fabricDrape,
    fitConfidence: values.fitConfidence,
    measurementSource: values.measurementSource,
    formality: values.formality,
    occasions: values.occasions,
    weather: values.weather,
    condition: values.condition,
    verifiedFields: values.verifiedFields
  };
}

const wardrobeCategories: WardrobeCategory[] = ["tops", "bottoms", "dresses", "native", "outerwear", "shoes", "bags", "accessories", "womens_hair"];

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => stringValue(item)).filter(Boolean).slice(0, 12);
}

function categoryValue(value: unknown): WardrobeCategory | "" {
  const category = stringValue(value) as WardrobeCategory;
  return wardrobeCategories.includes(category) ? category : "";
}

function selectedDefaultsFromUpload(upload: WardrobeUploadRecord | null): AITagConfirmationDefaults | undefined {
  if (!upload) return undefined;

  const category =
    categoryValue(upload.selectedCategory) ||
    categoryValue(upload.userInputMetadata?.category) ||
    categoryValue(upload.suggestedTags?.category);
  const detectedSubcategory =
    stringValue(upload.selectedCategoryLabel) ||
    stringValue(upload.userInputMetadata?.subcategory) ||
    stringValue(upload.suggestedTags?.subcategory) ||
    stringValue(upload.categorySpecificMetadata?.title);
  const resolvedSubtype = canonicalizeDetectedSubtype(category, detectedSubcategory);
  const subcategory = resolvedSubtype.matched ? resolvedSubtype.canonicalSubtype : detectedSubcategory;
  const detectedTitle = stringValue(upload.categorySpecificMetadata?.title);
  const itemLabel = detectedTitle
    ? canonicalizeDetectedSubtype(category, detectedTitle).label
    : resolvedSubtype.label || subcategory;
  const userInput = upload.userInputMetadata || {};

  if (!category && !subcategory && !itemLabel) return undefined;
  return {
    category,
    subcategory,
    itemLabel,
    primaryColor: stringValue(userInput.primaryColor) || stringValue(userInput.color) || stringValue(upload.suggestedTags?.color),
    fit: stringValue(userInput.fit) || stringValue(upload.suggestedTags?.fit),
    formality: stringValue(userInput.formality) || stringList(upload.suggestedTags?.formality)[0] || "",
    occasions: stringList(userInput.occasions).length ? stringList(userInput.occasions) : stringList(upload.suggestedTags?.occasions),
    weather: stringList(userInput.weather).length ? stringList(userInput.weather) : stringList(upload.suggestedTags?.weather),
    fabric: stringValue(userInput.fabric) || stringValue(userInput.material) || stringValue(upload.suggestedTags?.fabric),
    size: stringValue(userInput.size),
    brand: stringValue(userInput.brand)
  };
}

export function WardrobeUploadConfirmClient({ uploadId, batchId = "" }: { uploadId: string; batchId?: string }) {
  const session = useSession();
  const router = useRouter();
  const [upload, setUpload] = useState<WardrobeUploadRecord | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "unavailable" | "error">("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createdItem, setCreatedItem] = useState<WardrobeItem | null>(null);
  const [message, setMessage] = useState("");
  const [analysisJobId, setAnalysisJobId] = useState("");
  const formSectionRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const revealContent = useRevealContent();
  const selectedDefaults = useMemo(() => selectedDefaultsFromUpload(upload), [upload]);


  const loadUpload = useCallback(async () => {
    setStatus("loading");
    const result = await getWardrobeUpload(uploadId);
    if (result.ok) {
      setUpload(result.data.upload);
      setStatus("ready");
      return result.data.upload;
    }

    setUpload(null);
    setStatus(result.error.code === "NOT_FOUND" ? "not-found" : result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
    return null;
  }, [uploadId]);

  const analyzeUpload = useCallback(async () => {
    setIsAnalyzing(true);
    setMessage("");
    const result = await analyzeWardrobeUpload(uploadId);

    if (result.ok) {
      if ((result.data as any).job?.id) {
        const jobId = (result.data as any).job.id;
        setAnalysisJobId(jobId);
        setMessage("MyFitPick is reading your piece. This helps your stylist recommend better looks.");

        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
          const jobResult = await getJobStatus(jobId);
          if (!jobResult.ok) continue;

          if (jobResult.data.job.status === "completed") {
            setAnalysisJobId("");
            setIsAnalyzing(false);
            const refreshed = await loadUpload();
            setMessage("Your piece is ready for review.");
            return refreshed;
          }

          if (jobResult.data.job.status === "failed" || jobResult.data.job.status === "cancelled") {
            setAnalysisJobId("");
            setIsAnalyzing(false);
            setMessage(safeUserMessage(jobResult.data.job.errorMessage, "Add the essentials below and save the piece."));
            return await loadUpload();
          }
        }

        setIsAnalyzing(false);
        setMessage("MyFitPick is still reading your piece. Refresh shortly to continue.");
        return await loadUpload();
      }

      setIsAnalyzing(false);
      const refreshed = await loadUpload();
      setMessage(result.data.aiTagStatus === "failed" ? safeUserMessage(result.data.safeMessage, "Add the essentials below and save the piece.") : "Your piece is ready for review.");
      return refreshed;
    }

    setIsAnalyzing(false);
    setMessage("Add the essentials below and save the piece.");
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
    return null;
  }, [loadUpload, uploadId]);

  useEffect(() => {
    if (session.status !== "authenticated") return;

    void (async () => {
      const loaded = await loadUpload();
      if (loaded && loaded.aiTagStatus === "not_started") {
        await analyzeUpload();
      }
    })();
  }, [analyzeUpload, loadUpload, session.status]);

  async function handleConfirm(values: AITagConfirmationValues) {
    setIsSaving(true);
    setMessage("");
    const result = await confirmWardrobeUploadTags(uploadId, cleanItemPayload(values));
    setIsSaving(false);

    if (result.ok) {
      setCreatedItem(result.data.item);
      setUpload(result.data.upload);
      revealContent(successRef, { delayMs: 80, topOffset: 24, bottomOffset: 136 });
      return;
    }

    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }

  if (session.status === "loading" || status === "loading" || (session.status === "authenticated" && status === "idle")) {
    return <WardrobeLoadingState />;
  }

  if (session.status === "logged-out") return <WardrobeAuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <WardrobeBackendUnavailableState onRetry={() => void loadUpload()} />;
  }
  if (status === "error") return <WardrobeApiErrorState onRetry={() => void loadUpload()} />;

  if (status === "not-found" || !upload) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-ink">Upload not found</p>
        <p className="mt-2 text-xs leading-5 text-muted">This upload is not available for confirmation.</p>
        <Link href="/wardrobe/upload">
          <Button className="mt-4 w-full">Start upload</Button>
        </Link>
      </Card>
    );
  }

  if (createdItem) {
    const styleHref = `/stylist/create-look?wardrobeItemId=${encodeURIComponent(createdItem.id)}`;
    return (
      <div ref={successRef} className="mt-7 space-y-5">
        <WardrobeSaveSuccessState
          title="Verified wardrobe item saved."
          body={`${createdItem.name} is saved and ready for outfit planning.`}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {batchId ? <Button type="button" className="w-full" onClick={() => router.push(`/wardrobe/bulk-upload/${batchId}`)}>Review remaining items</Button> : null}
          <Button type="button" className="w-full" onClick={() => router.push(styleHref)}>
            Style this item
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={() => router.push(`/wardrobe/${createdItem.id}`)}>
            View details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <section ref={formSectionRef} className="mx-auto max-w-[680px]">
        <Card className="space-y-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cocoa"><Sparkles size={14} aria-hidden="true" />Item details</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Review and save</h1>
            {message && isAnalyzing ? <p className="mt-2 text-xs leading-5 text-muted">{message}</p> : null}
          </div>
          <AITagConfirmationForm
            aiAnalysis={upload.aiAnalysis}
            selectedDefaults={selectedDefaults}
            manualMode={Boolean(batchId) || !upload.aiAnalysis}
            disabled={isAnalyzing || isSaving}
            onSubmit={handleConfirm}
          />
        </Card>
      </section>
    </div>
  );
}
