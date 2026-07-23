"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WardrobeImageSlots } from "@/components/wardrobe/WardrobeImageSlots";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeLoadingState,
  WardrobeSaveSuccessState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { AITagConfirmationForm, type AITagConfirmationDefaults, type AITagConfirmationValues } from "@/components/wardrobe/AITagConfirmationForm";
import { useSession } from "@/hooks/use-session";
import { analyzeWardrobeUpload, confirmWardrobeUploadTags, getJobStatus, getWardrobeUpload, type WardrobeUploadRecord } from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";
import type { WardrobeCategory, WardrobeItem } from "@/types/wardrobe";

function cleanItemPayload(values: AITagConfirmationValues) {
  return {
    name: values.name,
    category: values.category,
    subcategory: values.subcategory || "",
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

const wardrobeCategories: WardrobeCategory[] = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const subcategory =
    stringValue(upload.selectedCategoryLabel) ||
    stringValue(upload.userInputMetadata?.subcategory) ||
    stringValue(upload.suggestedTags?.subcategory) ||
    stringValue(upload.categorySpecificMetadata?.title);
  const itemLabel = stringValue(upload.categorySpecificMetadata?.title) || subcategory;

  if (!category && !subcategory && !itemLabel) return undefined;
  return { category, subcategory, itemLabel };
}

export function WardrobeUploadConfirmClient({ uploadId }: { uploadId: string }) {
  const session = useSession();
  const router = useRouter();
  const [upload, setUpload] = useState<WardrobeUploadRecord | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "unavailable" | "error">("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createdItem, setCreatedItem] = useState<WardrobeItem | null>(null);
  const [message, setMessage] = useState("");
  const [analysisJobId, setAnalysisJobId] = useState("");
  const selectedDefaults = useMemo(() => selectedDefaultsFromUpload(upload), [upload]);

  const warnings = useMemo(() => upload?.aiAnalysis?.labelWarnings || [], [upload]);
  const lowConfidenceCount = useMemo(() => {
    const fields = upload?.aiAnalysis?.fields;
    if (!fields) return 0;
    return Object.values(fields).filter((field) => field.confidence < 0.65).length;
  }, [upload]);
  const reviewSteps = useMemo(
    () => [
      { label: "Photos uploaded", status: "complete" as const },
      { label: "Clothing check", status: isAnalyzing ? "current" as const : upload?.aiAnalysis ? "complete" as const : "warning" as const },
      { label: "Save item", status: createdItem ? "complete" as const : "pending" as const }
    ],
    [createdItem, isAnalyzing, upload?.aiAnalysis]
  );

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
        setMessage("MyFitPick is checking your clothing photos. This may take a moment.");

        for (let attempt = 0; attempt < 30; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 2500));
          const jobResult = await getJobStatus(jobId);
          if (!jobResult.ok) continue;

          if (jobResult.data.job.status === "completed") {
            setAnalysisJobId("");
            setIsAnalyzing(false);
            const refreshed = await loadUpload();
            setMessage("Your clothing details are ready to check.");
            return refreshed;
          }

          if (jobResult.data.job.status === "failed" || jobResult.data.job.status === "cancelled") {
            setAnalysisJobId("");
            setIsAnalyzing(false);
            setMessage(safeUserMessage(jobResult.data.job.errorMessage, "Analysis failed. Add tags manually."));
            return await loadUpload();
          }
        }

        setIsAnalyzing(false);
        setMessage("MyFitPick is still checking your clothing photos. Refresh shortly to continue.");
        return await loadUpload();
      }

      setIsAnalyzing(false);
      const refreshed = await loadUpload();
      setMessage(result.data.aiTagStatus === "failed" ? safeUserMessage(result.data.safeMessage, "Clothing check failed. Add details manually.") : "Your clothing details are ready to check.");
      return refreshed;
    }

    setIsAnalyzing(false);
    setMessage("Clothing check is unavailable. You can still save details manually.");
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
    return (
      <div className="mt-7 space-y-5">
        <WardrobeSaveSuccessState
          title="Added to wardrobe"
          body={`${createdItem.name} is saved and ready for outfit planning.`}
          href={`/wardrobe/${createdItem.id}`}
        />
        <Button type="button" className="w-full" onClick={() => router.push(`/wardrobe/${createdItem.id}`)}>
          View wardrobe item
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-7 space-y-7">
      <section>
        <SectionHeader title="Review your garment intelligence" eyebrow="Uploaded photos" />
        <Card className="space-y-4 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                <Sparkles size={14} aria-hidden="true" />
                Review details
              </p>
              <h2 className="font-editorial mt-2 text-4xl font-semibold leading-none text-ink">Confirm what MyFitPick detected.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Check the category, colour, material, fit, and size details before saving the item to your closet.</p>
            </div>
          </div>
          <ProgressSteps steps={reviewSteps} />
          <WardrobeImageSlots images={upload.images as any} disabled />
          <div className="rounded-2xl border border-cocoa/15 bg-cocoa/10 px-3 py-2 text-xs leading-5 text-ink">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 font-semibold">
                {upload.aiAnalysis ? <CheckCircle2 size={14} className="text-success" aria-hidden="true" /> : <Sparkles size={14} className="text-cocoa" aria-hidden="true" />}
                {isAnalyzing ? "Checking photos..." : upload.aiAnalysis ? "Check the clothing details" : "Waiting for clothing check"}
              </p>
            </div>
            {message ? <p className="mt-1 text-muted">{message}</p> : null}
          </div>
          {warnings.length || lowConfidenceCount ? (
            <div className="rounded-2xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-ink">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">Confirm what MyFitPick detected</p>
                <Badge tone="warning">Needs review</Badge>
              </div>
              {lowConfidenceCount ? <p className="mt-1 text-muted">{lowConfidenceCount} field{lowConfidenceCount === 1 ? "" : "s"} marked low confidence — please verify.</p> : null}
              {warnings.map((warning) => <p key={warning} className="mt-1 text-muted">{warning}</p>)}
            </div>
          ) : null}
          <Button type="button" variant="secondary" className="w-full" onClick={() => void analyzeUpload()} disabled={isAnalyzing || isSaving}>
            <RotateCcw size={16} aria-hidden="true" />
            {isAnalyzing ? "Checking..." : "Check photos again"}
          </Button>
        </Card>
      </section>

      <section>
        <SectionHeader title="Save to wardrobe" eyebrow="Check details" />
        <Card>
          <AITagConfirmationForm
            aiAnalysis={upload.aiAnalysis}
            selectedDefaults={selectedDefaults}
            disabled={isAnalyzing || isSaving}
            onSubmit={handleConfirm}
          />
        </Card>
      </section>
    </div>
  );
}
