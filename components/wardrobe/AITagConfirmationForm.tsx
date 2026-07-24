"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { useRevealContent } from "@/hooks/use-reveal-content";
import type { WardrobeAiAnalysis } from "@/lib/ai/schemas/wardrobe-ai.schema";
import { confidenceLabel, garmentMeasurementKeysForCategory } from "@/lib/wardrobe/category-intelligence";
import type { FabricDrape, GarmentFit, GarmentMeasurements, MeasurementSource, SizeSystem, StretchLevel, TaggedSize, WardrobeCategory, WardrobeCondition } from "@/types/wardrobe";

type FieldKind = "text" | "list" | "category";

type FieldConfig = {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
};

export type AITagConfirmationValues = {
  name: string;
  category: WardrobeCategory;
  subcategory?: string;
  color: string;
  pattern?: string;
  fabric?: string;
  fit?: string;
  formality: string[];
  occasions: string[];
  weather: string[];
  taggedSize: TaggedSize;
  sizeSystem: SizeSystem;
  garmentFit: GarmentFit;
  garmentMeasurements: GarmentMeasurements;
  stretchLevel: StretchLevel;
  fabricDrape: FabricDrape;
  fitConfidence: number;
  measurementSource: MeasurementSource;
  condition: "ready" | "needs-care" | "missing-tags";
  verifiedFields: Record<string, { value: string | string[] | number | null; confidence: number; originalConfidence: number; source: "user_confirmed" }>;
};

export type AITagConfirmationDefaults = {
  category?: WardrobeCategory | "";
  subcategory?: string;
  itemLabel?: string;
};

const essentialFields: FieldConfig[] = [
  { key: "category", label: "Category", kind: "category", required: true },
  { key: "subcategory", label: "Subcategory" },
  { key: "brand", label: "Brand" },
  { key: "primaryColor", label: "Colour", required: true },
  { key: "pattern", label: "Pattern" },
  { key: "fabricComposition", label: "Material from details" },
  { key: "fabricEstimate", label: "Material estimate" },
  { key: "size", label: "Size" },
  { key: "fit", label: "Fit" },
  { key: "formalityScore", label: "Formality" },
  { key: "occasionSuitability", label: "Occasions", kind: "list" },
  { key: "weatherSuitability", label: "Weather suitability", kind: "list" }
];

const hiddenAiFields: FieldConfig[] = [
  { key: "garmentType", label: "Item type" },
  { key: "secondaryColors", label: "Secondary colours", kind: "list" },
  { key: "silhouette", label: "Silhouette" },
  { key: "sleeveLength", label: "Sleeve length" },
  { key: "necklineCollar", label: "Neckline / collar" },
  { key: "length", label: "Length" },
  { key: "texture", label: "Texture" },
  { key: "thicknessEstimate", label: "Thickness estimate" },
  { key: "layeringSuitability", label: "Layering suitability" },
  { key: "luxuryScore", label: "Luxury score" },
  { key: "seasonSuitability", label: "Season suitability", kind: "list" },
  { key: "eventRelevance", label: "Event relevance" },
  { key: "recognizedEntity", label: "Recognised detail" },
  { key: "entityType", label: "Detail type" },
  { key: "entityConfidence", label: "Detail match" },
  { key: "sportCategory", label: "Sport category" },
  { key: "teamOrNation", label: "Team or nation" },
  { key: "clubOrFederation", label: "Club or federation" },
  { key: "playerName", label: "Player name" },
  { key: "playerNumber", label: "Player number" },
  { key: "kitType", label: "Kit type" },
  { key: "seasonEstimate", label: "Season estimate" },
  { key: "logoDetections", label: "Logo detections", kind: "list" },
  { key: "textDetections", label: "Visible text", kind: "list" },
  { key: "brandSignals", label: "Brand signals", kind: "list" },
  { key: "entityWarnings", label: "Detail warnings", kind: "list" },
  { key: "careInstructions", label: "Care instructions", kind: "list" },
  { key: "stylingNotes", label: "Styling notes", kind: "list" },
  { key: "rawLabelText", label: "Readable product text" },
  { key: "countryOfOrigin", label: "Manufacturing text" }
];

const allFields = [...essentialFields, ...hiddenAiFields];
const categoryOptions: WardrobeCategory[] = ["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories"];
const conditionOptions: Array<{ value: WardrobeCondition; label: string; helper: string }> = [
  { value: "ready", label: "Ready", helper: "Clean, wearable, and fully usable for styling." },
  { value: "needs-care", label: "Needs care", helper: "Requires cleaning, repair, steaming, or attention before wearing." },
  { value: "missing-tags", label: "Needs more detail", helper: "Keep this when important styling details are still uncertain." }
];
const taggedSizeOptions: TaggedSize[] = ["unknown", "XS", "S", "M", "L", "XL", "XXL", "custom"];
const sizeSystemOptions: SizeSystem[] = ["unknown", "international", "US", "UK", "EU", "custom"];
const garmentFitOptions: GarmentFit[] = ["unknown", "slim", "regular", "relaxed", "oversized", "tailored", "flowing"];
const stretchOptions: StretchLevel[] = ["unknown", "none", "low", "medium", "high"];
const drapeOptions: FabricDrape[] = ["unknown", "structured", "soft", "flowing", "heavy", "stiff"];
const measurementSourceOptions: MeasurementSource[] = ["unknown", "label_ocr", "user_confirmed", "ai_estimated", "manual"];
const garmentMeasurementFields: Array<{ key: keyof GarmentMeasurements; label: string; placeholder: string }> = [
  { key: "chestWidthCm", label: "Chest width", placeholder: "52" },
  { key: "shoulderWidthCm", label: "Shoulder width", placeholder: "46" },
  { key: "sleeveLengthCm", label: "Sleeve length", placeholder: "63" },
  { key: "bodyLengthCm", label: "Body length", placeholder: "72" },
  { key: "waistCm", label: "Waist", placeholder: "84" },
  { key: "hipsCm", label: "Hips", placeholder: "98" },
  { key: "inseamCm", label: "Inseam", placeholder: "78" },
  { key: "outseamCm", label: "Outseam", placeholder: "104" },
  { key: "shoeLengthCm", label: "Shoe length", placeholder: "28" },
  { key: "heelHeightCm", label: "Heel height", placeholder: "4" }
];

const inputClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/80 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted";

function stringifyValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function hasMeaningfulValue(value: string | undefined) {
  const cleaned = String(value || "").trim().toLowerCase();
  return Boolean(cleaned && cleaned !== "unknown" && cleaned !== "n/a" && cleaned !== "none");
}

function clampScore(key: string, value: string) {
  if (key !== "formalityScore" && key !== "luxuryScore") return value.trim();
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value.trim();
  return String(Math.max(0, Math.min(numeric > 1 ? 10 : 1, numeric)));
}

function normalizeTaggedSize(value: unknown): TaggedSize {
  const cleaned = String(value || "").trim().toUpperCase();
  if (["XS", "S", "M", "L", "XL", "XXL"].includes(cleaned)) return cleaned as TaggedSize;
  if (cleaned && cleaned !== "UNKNOWN") return "custom";
  return "unknown";
}

function normalizeOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  const cleaned = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return options.includes(cleaned as T) ? cleaned as T : fallback;
}

function measurementNumber(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 10) / 10 : null;
}

function fieldFromAnalysis(aiAnalysis: WardrobeAiAnalysis | null | undefined, key: string) {
  return aiAnalysis?.fields?.[key as keyof WardrobeAiAnalysis["fields"]] as any;
}

function sourceLabel(source?: string) {
  if (source === "ocr") return "Label";
  if (source === "vision") return "Vision";
  if (source === "user_confirmed") return "User";
  if (source === "system_inferred") return "FitPick";
  return "FitPick";
}

export function AITagConfirmationForm({
  aiAnalysis,
  selectedDefaults,
  disabled = false,
  onSubmit
}: {
  aiAnalysis?: WardrobeAiAnalysis | null;
  selectedDefaults?: AITagConfirmationDefaults;
  disabled?: boolean;
  onSubmit: (values: AITagConfirmationValues) => void | Promise<void>;
}) {
  const initialValues = useMemo<Record<string, string>>(
    () => {
      const detected = Object.fromEntries(
        allFields.map((field) => [field.key, stringifyValue(fieldFromAnalysis(aiAnalysis, field.key)?.value)])
      ) as Record<string, string>;

      if (selectedDefaults?.category) detected.category = selectedDefaults.category;
      if (selectedDefaults?.subcategory) detected.subcategory = selectedDefaults.subcategory;

      return detected;
    },
    [aiAnalysis, selectedDefaults?.category, selectedDefaults?.subcategory]
  );
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [taggedSize, setTaggedSize] = useState<TaggedSize>("unknown");
  const [sizeSystem, setSizeSystem] = useState<SizeSystem>("unknown");
  const [garmentFit, setGarmentFit] = useState<GarmentFit>("unknown");
  const [stretchLevel, setStretchLevel] = useState<StretchLevel>("unknown");
  const [fabricDrape, setFabricDrape] = useState<FabricDrape>("unknown");
  const [measurementSource, setMeasurementSource] = useState<MeasurementSource>("unknown");
  const [fitConfidence, setFitConfidence] = useState("0");
  const [garmentMeasurements, setGarmentMeasurements] = useState<Record<string, string>>({});
  const [condition, setCondition] = useState<WardrobeCondition>("ready");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const fitDetailsRef = useRef<HTMLDetailsElement>(null);
  const revealContent = useRevealContent();
  const lowConfidenceCount = useMemo(() => {
    if (!aiAnalysis?.fields) return 0;
    return essentialFields.filter((field) => (fieldFromAnalysis(aiAnalysis, field.key)?.confidence ?? 0) < 0.65).length;
  }, [aiAnalysis]);
  const visibleMeasurementFields = useMemo(() => {
    const allowed = new Set(garmentMeasurementKeysForCategory(values.category || "tops", values.subcategory || ""));
    return garmentMeasurementFields.filter((field) => allowed.has(field.key));
  }, [values.category, values.subcategory]);
  const visibleMeasurementKeys = useMemo(() => visibleMeasurementFields.map((field) => field.key), [visibleMeasurementFields]);
  const stylistReadinessChecks = useMemo(() => {
    const material = values.fabricComposition || values.fabricEstimate;
    const fit = values.fit || (garmentFit !== "unknown" ? garmentFit : "");
    return [
      { label: "Category", ready: hasMeaningfulValue(values.category) },
      { label: "Subtype", ready: hasMeaningfulValue(values.subcategory) },
      { label: "Colour", ready: hasMeaningfulValue(values.primaryColor) },
      { label: "Material", ready: hasMeaningfulValue(material) },
      { label: "Fit", ready: hasMeaningfulValue(fit) },
      { label: "Occasion", ready: splitList(values.occasionSuitability || "").length > 0 },
      { label: "Weather", ready: splitList(values.weatherSuitability || "").length > 0 },
      { label: "Readiness", ready: Boolean(condition) }
    ];
  }, [condition, garmentFit, values]);
  const stylistReadyCount = stylistReadinessChecks.filter((check) => check.ready).length;

  useEffect(() => {
    const next = initialValues;
    setValues(next);
    setName([next.brand, next.primaryColor, next.garmentType || next.subcategory].filter(Boolean).join(" ").trim() || selectedDefaults?.itemLabel || selectedDefaults?.subcategory || "");
    const sizeField = fieldFromAnalysis(aiAnalysis, "taggedSize")?.value || fieldFromAnalysis(aiAnalysis, "size")?.value;
    const fitField = fieldFromAnalysis(aiAnalysis, "garmentFit")?.value || fieldFromAnalysis(aiAnalysis, "fit")?.value;
    setTaggedSize(normalizeTaggedSize(sizeField));
    setSizeSystem(normalizeOption(fieldFromAnalysis(aiAnalysis, "sizeSystem")?.value, sizeSystemOptions, "unknown"));
    setGarmentFit(normalizeOption(fitField, garmentFitOptions, "unknown"));
    setStretchLevel(normalizeOption(fieldFromAnalysis(aiAnalysis, "stretchLevel")?.value, stretchOptions, "unknown"));
    setFabricDrape(normalizeOption(fieldFromAnalysis(aiAnalysis, "fabricDrape")?.value || fieldFromAnalysis(aiAnalysis, "silhouette")?.value, drapeOptions, "unknown"));
    setMeasurementSource(fieldFromAnalysis(aiAnalysis, "size")?.source === "ocr" ? "label_ocr" : normalizeOption(fieldFromAnalysis(aiAnalysis, "measurementSource")?.value, measurementSourceOptions, "ai_estimated"));
    setFitConfidence(String(Math.max(fieldFromAnalysis(aiAnalysis, "fit")?.confidence ?? 0, fieldFromAnalysis(aiAnalysis, "garmentFit")?.confidence ?? 0).toFixed(2)));
    setGarmentMeasurements({});
    setCondition(splitList(next.occasionSuitability || "").length && next.category && next.primaryColor ? "ready" : "missing-tags");
  }, [aiAnalysis, initialValues, selectedDefaults?.itemLabel, selectedDefaults?.subcategory]);

  useEffect(() => {
    const allowed = new Set(visibleMeasurementKeys);
    setGarmentMeasurements((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => allowed.has(key as keyof GarmentMeasurements)))
    );
  }, [visibleMeasurementKeys]);

  function buildVerifiedFields() {
    const verifiedFields = Object.fromEntries(
      allFields.map((field) => {
        const original = fieldFromAnalysis(aiAnalysis, field.key);
        const value = field.kind === "list" ? splitList(values[field.key] || "") : clampScore(field.key, values[field.key] || "") || null;
        return [
          field.key,
          {
            value,
            confidence: 1,
            originalConfidence: original?.confidence ?? 0,
            source: "user_confirmed" as const
          }
        ];
      })
    );

    Object.assign(verifiedFields, {
      taggedSize: { value: taggedSize, confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "taggedSize")?.confidence ?? fieldFromAnalysis(aiAnalysis, "size")?.confidence ?? 0, source: "user_confirmed" as const },
      sizeSystem: { value: sizeSystem, confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "sizeSystem")?.confidence ?? 0, source: "user_confirmed" as const },
      garmentFit: { value: garmentFit, confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "garmentFit")?.confidence ?? fieldFromAnalysis(aiAnalysis, "fit")?.confidence ?? 0, source: "user_confirmed" as const },
      stretchLevel: { value: stretchLevel, confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "stretchLevel")?.confidence ?? 0, source: "user_confirmed" as const },
      fabricDrape: { value: fabricDrape, confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "fabricDrape")?.confidence ?? 0, source: "user_confirmed" as const },
      fitConfidence: { value: Math.max(0, Math.min(1, Number(fitConfidence) || 0)), confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "fitConfidence")?.confidence ?? 0, source: "user_confirmed" as const },
      measurementSource: { value: measurementSource, confidence: 1, originalConfidence: fieldFromAnalysis(aiAnalysis, "measurementSource")?.confidence ?? 0, source: "user_confirmed" as const }
    });
    Object.assign(verifiedFields, {
      condition: { value: condition, confidence: 1, originalConfidence: 0, source: "user_confirmed" as const }
    });

    return verifiedFields;
  }

  function submit() {
    const itemName = name.trim();
    const category = (values.category || "tops") as WardrobeCategory;
    const primaryColor = values.primaryColor.trim();

    if (!itemName || !category || !primaryColor) {
      setError("Add a name, category, and colour before saving.");
      revealContent(errorRef, { delayMs: 60, topOffset: 24, bottomOffset: 136 });
      return;
    }

    const parsedGarmentMeasurements = Object.fromEntries(
      visibleMeasurementFields
        .map((field) => [field.key, measurementNumber(garmentMeasurements[field.key] || "")])
        .filter(([, value]) => value !== null)
    ) as GarmentMeasurements;

    void onSubmit({
      name: itemName,
      category,
      subcategory: values.subcategory.trim(),
      color: primaryColor,
      pattern: values.pattern.trim(),
      fabric: values.fabricComposition.trim() || values.fabricEstimate.trim(),
      fit: values.fit.trim(),
      formality: values.formalityScore ? [values.formalityScore.trim()] : [],
      occasions: splitList(values.occasionSuitability),
      weather: splitList(values.weatherSuitability),
      taggedSize,
      sizeSystem,
      garmentFit,
      garmentMeasurements: parsedGarmentMeasurements,
      stretchLevel,
      fabricDrape,
      fitConfidence: Math.max(0, Math.min(1, Number(fitConfidence) || 0)),
      measurementSource,
      condition,
      verifiedFields: buildVerifiedFields()
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="rounded-2xl border border-line bg-canvas/60 p-3">
        <p className="text-sm font-semibold text-ink">Confirm what MyFitPick detected</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Review the essentials. Category, colour, material, fit, occasion, weather, and readiness guide your stylist later.
        </p>
        {lowConfidenceCount ? (
          <p className="mt-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">
            Low confidence - please verify {lowConfidenceCount} field{lowConfidenceCount === 1 ? "" : "s"}.
          </p>
        ) : null}
        {!aiAnalysis ? (
          <p className="mt-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">
            MyFitPick could not read enough details. Add the essentials below and save the piece.
          </p>
        ) : null}
        <div className="mt-3">
          <FieldGroup label="Item name" htmlFor="ai-field-name" required>
            <input id="ai-field-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="White cotton shirt" required />
          </FieldGroup>
        </div>
      </div>

      {error ? <p ref={errorRef} className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}

      <section className="rounded-2xl border border-olive/20 bg-olive/10 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Stylist-ready checklist</h3>
            <p className="mt-1 text-xs leading-5 text-muted">Confirm what you know. Leave uncertain details blank instead of guessing.</p>
          </div>
          <Badge tone={stylistReadyCount >= stylistReadinessChecks.length ? "success" : "warning"}>
            {stylistReadyCount}/{stylistReadinessChecks.length}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stylistReadinessChecks.map((check) => (
            <div key={check.label} className="rounded-2xl border border-line bg-white/75 px-3 py-2">
              <p className="truncate text-xs font-bold text-ink">{check.label}</p>
              <p className={`mt-1 text-[11px] font-semibold ${check.ready ? "text-success" : "text-muted"}`}>
                {check.ready ? "Set" : "Review"}
              </p>
            </div>
          ))}
        </div>
        {values.category === "shoes" ? (
          <p className="mt-3 rounded-2xl border border-cocoa/15 bg-cocoa/10 px-3 py-2 text-xs font-semibold leading-5 text-ink">
            This item is saved as shoes, so MyFitPick can use it as footwear when completing outfits.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-canvas/60 p-3">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-ink">Review details</h3>
          <p className="mt-1 text-xs leading-5 text-muted">Keep unknown details blank and update them later if needed.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {essentialFields.map((field) => {
            const fieldId = `ai-field-${field.key}`;
            const original = fieldFromAnalysis(aiAnalysis, field.key);
            return (
              <FieldGroup key={field.key} label={field.label} htmlFor={fieldId} required={field.required}>
                {original ? (
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={original.source === "ocr" && original.confidence >= 0.8 ? "success" : original.confidence < 0.65 ? "warning" : "neutral"}>
                      {confidenceLabel(original.confidence, original.source)}
                    </Badge>
                    <span className="text-[11px] font-semibold text-muted">{sourceLabel(original.source)}</span>
                  </div>
                ) : null}
                {field.kind === "category" ? (
                  <select id={fieldId} className={inputClass} value={values[field.key] || "tops"} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                    {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.kind === "list" ? (
                  <textarea
                    id={fieldId}
                    className={`${inputClass} min-h-20`}
                    value={values[field.key] || ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder="Comma-separated"
                  />
                ) : (
                  <input
                    id={fieldId}
                    className={inputClass}
                    value={values[field.key] || ""}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.required ? "Required" : "Optional"}
                    required={field.required}
                  />
                )}
              </FieldGroup>
            );
          })}
        </div>
        <div className="mt-3">
          <FieldGroup label="Readiness" htmlFor="ai-field-condition">
            <select id="ai-field-condition" className={inputClass} value={condition} onChange={(event) => setCondition(event.target.value as WardrobeCondition)}>
              {conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </FieldGroup>
          <p className="mt-2 text-xs leading-5 text-muted">
            {conditionOptions.find((option) => option.value === condition)?.helper}
          </p>
        </div>
      </section>

      <details
        ref={fitDetailsRef}
        className="rounded-2xl border border-line bg-canvas/60 p-3"
        onToggle={(event) => {
          if (event.currentTarget.open) revealContent(fitDetailsRef, { delayMs: 80, topOffset: 24, bottomOffset: 136 });
        }}
      >
        <summary className="cursor-pointer text-sm font-semibold text-ink">Improve fit accuracy</summary>
        <p className="mt-2 text-xs leading-5 text-muted">Optional. Add size and measurement details only when you know them.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldGroup label="Size" htmlFor="fit-tagged-size">
            <select id="fit-tagged-size" className={inputClass} value={taggedSize} onChange={(event) => setTaggedSize(event.target.value as TaggedSize)}>
              {taggedSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Size system" htmlFor="fit-size-system">
            <select id="fit-size-system" className={inputClass} value={sizeSystem} onChange={(event) => setSizeSystem(event.target.value as SizeSystem)}>
              {sizeSystemOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="How does it fit?" htmlFor="fit-garment-fit">
            <select id="fit-garment-fit" className={inputClass} value={garmentFit} onChange={(event) => setGarmentFit(event.target.value as GarmentFit)}>
              {garmentFitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Stretch" htmlFor="fit-stretch">
            <select id="fit-stretch" className={inputClass} value={stretchLevel} onChange={(event) => setStretchLevel(event.target.value as StretchLevel)}>
              {stretchOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Fabric drape" htmlFor="fit-drape">
            <select id="fit-drape" className={inputClass} value={fabricDrape} onChange={(event) => setFabricDrape(event.target.value as FabricDrape)}>
              {drapeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Size accuracy" htmlFor="fit-confidence">
            <input id="fit-confidence" type="number" min="0" max="1" step="0.05" className={inputClass} value={fitConfidence} onChange={(event) => setFitConfidence(event.target.value)} />
          </FieldGroup>
          <FieldGroup label="How size was added" htmlFor="fit-source">
            <select id="fit-source" className={inputClass} value={measurementSource} onChange={(event) => setMeasurementSource(event.target.value as MeasurementSource)}>
              {measurementSourceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </FieldGroup>
          {visibleMeasurementFields.length ? visibleMeasurementFields.map((field) => (
            <FieldGroup key={field.key} label={`${field.label} (cm)`} htmlFor={`fit-${field.key}`}>
              <input
                id={`fit-${field.key}`}
                type="number"
                min="0"
                step="0.1"
                className={inputClass}
                value={garmentMeasurements[field.key] || ""}
                onChange={(event) => setGarmentMeasurements((current) => ({ ...current, [field.key]: event.target.value }))}
                placeholder={field.placeholder}
              />
            </FieldGroup>
          )) : (
            <p className="rounded-2xl border border-line bg-white/70 p-3 text-xs font-semibold leading-5 text-muted sm:col-span-2">
              No garment body measurements are needed for this category.
            </p>
          )}
        </div>
      </details>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={submit} disabled={disabled}>
          Confirm all
        </Button>
        <Button type="submit" disabled={disabled}>
          Save to wardrobe
        </Button>
      </div>
    </form>
  );
}
