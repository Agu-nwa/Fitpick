"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { useRevealContent } from "@/hooks/use-reveal-content";
import type { WardrobeAiAnalysis } from "@/lib/ai/schemas/wardrobe-ai.schema";
import { confidenceLabel, garmentMeasurementKeysForCategory } from "@/lib/wardrobe/category-intelligence";
import type { FabricDrape, GarmentFit, GarmentMeasurements, MeasurementSource, SizeSystem, StretchLevel, TaggedSize, WardrobeCategory, WardrobeCondition, WardrobeItem } from "@/types/wardrobe";
import { getCanonicalSubtypeOptions, resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";

type FieldKind = "text" | "list" | "category";

type FieldConfig = {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
};

export type AITagConfirmationValues = Pick<WardrobeItem, "canonicalSubtype" | "structureRole" | "stylingRole" | "setComponents" | "visibilityRole" | "formalityLevel" | "taxonomyConfidence" | "taxonomyEvidence" | "taxonomyNeedsReview" | "taxonomyVersion"> & {
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
  primaryColor?: string;
  fit?: string;
  formality?: string;
  occasions?: string[];
  weather?: string[];
  fabric?: string;
  size?: string;
  brand?: string;
};

const reviewFields: FieldConfig[] = [
  { key: "category", label: "Category", kind: "category", required: true },
  { key: "subcategory", label: "Subcategory" },
  { key: "primaryColor", label: "Colour", required: true },
  { key: "fit", label: "Fit" },
  { key: "formalityScore", label: "Formality" },
  { key: "occasionSuitability", label: "Occasions", kind: "list" },
  { key: "weatherSuitability", label: "Weather suitability", kind: "list" }
];

const detectedDetailFields: FieldConfig[] = [
  { key: "brand", label: "Brand" },
  { key: "pattern", label: "Pattern" },
  { key: "fabricComposition", label: "Material from label" },
  { key: "fabricEstimate", label: "Material estimate" },
  { key: "size", label: "Size" }
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

const allFields = [...reviewFields, ...detectedDetailFields, ...hiddenAiFields];
const categoryOptions: WardrobeCategory[] = ["tops", "bottoms", "dresses", "native", "outerwear", "shoes", "bags", "accessories", "womens_hair"];
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

const subtypePresets = Object.fromEntries(categoryOptions.map((category) => [category, getCanonicalSubtypeOptions(category).map((option) => option.label)])) as Partial<Record<WardrobeCategory, string[]>>;

const scalarPresets: Record<string, string[]> = {
  pattern: ["Plain", "Striped", "Checked", "Graphic", "Floral", "Textured"],
  fabricComposition: ["Cotton", "Denim", "Linen", "Wool", "Leather", "Polyester", "Knit", "Silk"],
  fabricEstimate: ["Cotton", "Denim", "Linen", "Wool", "Leather", "Polyester", "Knit", "Silk"],
  fit: ["Slim", "Regular", "Relaxed", "Oversized", "Tailored", "Flowing"],
  formalityScore: ["Casual", "Smart casual", "Business casual", "Formal", "Evening"],
  texture: ["Smooth", "Ribbed", "Textured", "Soft", "Crisp", "Glossy"],
  thicknessEstimate: ["Light", "Medium", "Heavy"],
  layeringSuitability: ["Good alone", "Good under jacket", "Good over shirt", "Not ideal for layering"]
};

const listPresets: Record<string, string[]> = {
  occasionSuitability: ["Work", "Dinner", "Date night", "Wedding", "Church", "Weekend", "Travel", "Party"],
  weatherSuitability: ["Hot", "Warm", "Mild", "Cold", "Rainy"],
  seasonSuitability: ["All season", "Dry season", "Rainy season", "Summer", "Winter"],
  careInstructions: ["Machine wash", "Hand wash", "Dry clean", "Do not bleach", "Iron low"],
  stylingNotes: ["Good alone", "Good under jacket", "Good with trousers", "Good with jeans", "Statement piece"]
};

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

function joinUniqueList(current: string, next: string) {
  const values = splitList(current);
  if (!values.some((value) => value.toLowerCase() === next.toLowerCase())) values.push(next);
  return values.join(", ");
}

function PresetButtons({
  options,
  onSelect,
  selected = []
}: {
  options?: string[];
  onSelect: (value: string) => void;
  selected?: string[];
}) {
  if (!options?.length) return null;
  const selectedSet = new Set(selected.map((value) => value.toLowerCase()));
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`focus-ring rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${selectedSet.has(option.toLowerCase()) ? "border-cocoa/40 bg-cocoa/10 text-cocoa" : "border-line bg-white/70 text-muted hover:border-cocoa/35 hover:text-ink"}`}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
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
  manualMode = false,
  disabled = false,
  onSubmit
}: {
  aiAnalysis?: WardrobeAiAnalysis | null;
  selectedDefaults?: AITagConfirmationDefaults;
  manualMode?: boolean;
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
      if (selectedDefaults?.primaryColor) detected.primaryColor = selectedDefaults.primaryColor;
      if (selectedDefaults?.fit) detected.fit = selectedDefaults.fit;
      if (selectedDefaults?.formality) detected.formalityScore = selectedDefaults.formality;
      if (selectedDefaults?.occasions?.length) detected.occasionSuitability = selectedDefaults.occasions.join(", ");
      if (selectedDefaults?.weather?.length) detected.weatherSuitability = selectedDefaults.weather.join(", ");
      if (selectedDefaults?.fabric) {
        detected.fabricComposition = selectedDefaults.fabric;
        detected.fabricEstimate = detected.fabricEstimate || selectedDefaults.fabric;
      }
      if (selectedDefaults?.size) detected.size = selectedDefaults.size;
      if (selectedDefaults?.brand) detected.brand = selectedDefaults.brand;

      return detected;
    },
    [
      aiAnalysis,
      selectedDefaults?.brand,
      selectedDefaults?.category,
      selectedDefaults?.fabric,
      selectedDefaults?.fit,
      selectedDefaults?.formality,
      selectedDefaults?.occasions,
      selectedDefaults?.primaryColor,
      selectedDefaults?.size,
      selectedDefaults?.subcategory,
      selectedDefaults?.weather
    ]
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
  const [editDetails, setEditDetails] = useState(manualMode);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const revealContent = useRevealContent();
  const lowConfidenceCount = useMemo(() => {
    if (!aiAnalysis?.fields) return 0;
    return reviewFields.filter((field) => (fieldFromAnalysis(aiAnalysis, field.key)?.confidence ?? 0) < 0.65).length;
  }, [aiAnalysis]);
  const visibleMeasurementFields = useMemo(() => {
    const allowed = new Set(garmentMeasurementKeysForCategory(values.category || "tops", values.subcategory || ""));
    return garmentMeasurementFields.filter((field) => allowed.has(field.key));
  }, [values.category, values.subcategory]);
  const visibleMeasurementKeys = useMemo(() => visibleMeasurementFields.map((field) => field.key), [visibleMeasurementFields]);
  const editableReviewFields = useMemo(
    () => manualMode ? reviewFields.filter((field) => ["category", "subcategory", "primaryColor"].includes(field.key)) : reviewFields,
    [manualMode]
  );
  const reviewSummary = useMemo(() => {
    const itemType = [values.primaryColor, values.subcategory || values.garmentType || values.category]
      .filter(Boolean)
      .join(" ")
      .trim();
    const occasions = splitList(values.occasionSuitability || "");
    const weather = splitList(values.weatherSuitability || "");
    return {
      title: itemType || "Closet item",
      stylingLine: [values.fit, values.formalityScore].filter(Boolean).join(" · "),
      occasionLine: occasions.length ? `Ready for ${occasions.slice(0, 3).join(", ")}` : "Occasion not set",
      weatherLine: weather.length ? weather.slice(0, 3).join(", ") : "Weather not set"
    };
  }, [values]);
  const reviewWarnings = useMemo(() => {
    const warnings = [];
    if (!hasMeaningfulValue(values.category)) warnings.push("Category needs review");
    if (!hasMeaningfulValue(values.primaryColor)) warnings.push("Colour needs review");
    if (!splitList(values.occasionSuitability || "").length) warnings.push("Occasion needs review");
    if (!splitList(values.weatherSuitability || "").length) warnings.push("Weather needs review");
    if (lowConfidenceCount) warnings.push("Some details are low confidence");
    if (!aiAnalysis) warnings.push("AI details need review");
    return warnings.slice(0, 5);
  }, [aiAnalysis, lowConfidenceCount, values.category, values.occasionSuitability, values.primaryColor, values.weatherSuitability]);

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
    const taxonomy = resolveCanonicalTaxonomy({ category, subcategory: values.subcategory.trim(), name: itemName });

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
      canonicalSubtype: taxonomy.canonicalSubtype,
      structureRole: taxonomy.structureRole,
      stylingRole: taxonomy.stylingRole,
      setComponents: taxonomy.setComponents,
      visibilityRole: taxonomy.visibilityRole,
      formalityLevel: taxonomy.formalityLevel,
      taxonomyConfidence: taxonomy.confidence,
      taxonomyEvidence: taxonomy.evidence,
      taxonomyNeedsReview: taxonomy.needsReview,
      taxonomyVersion: taxonomy.taxonomyVersion,
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
      <div className={manualMode ? "" : "rounded-2xl border border-line bg-canvas/60 p-3"}>
        {!manualMode ? <><p className="text-sm font-semibold text-ink">Quick review</p><p className="mt-1 text-xs leading-5 text-muted">Save it if this looks right. Edit only what needs correction.</p></> : null}
        {lowConfidenceCount ? (
          <p className="mt-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">
            Some details may need a quick check.
          </p>
        ) : null}
        {!aiAnalysis ? (
          <p className="mt-2 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-2 text-xs font-semibold text-ink">
            MyFitPick could not read enough details. Review the basics and save the piece.
          </p>
        ) : null}
        <div className="mt-3">
          <FieldGroup label="Item name" htmlFor="ai-field-name" required>
            <input id="ai-field-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="White cotton shirt" required />
          </FieldGroup>
        </div>
      </div>

      {error ? <p ref={errorRef} className="rounded-2xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-ink">{error}</p> : null}

      {!manualMode ? <section className="rounded-[1.5rem] border border-olive/20 bg-olive/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-editorial text-2xl font-semibold leading-none text-ink">{reviewSummary.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{reviewSummary.stylingLine || "Styled with your upload details."}</p>
          </div>
          <Badge tone={reviewWarnings.length ? "warning" : "success"}>
            {reviewWarnings.length ? "Review suggested" : "Ready"}
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[reviewSummary.occasionLine, reviewSummary.weatherLine, values.category === "shoes" ? "Footwear" : values.category].filter((item): item is string => Boolean(item)).map((item) => (
            <div key={item} className="rounded-2xl border border-line bg-white/75 px-3 py-2 text-xs font-bold text-ink">
              {item}
            </div>
          ))}
        </div>

        {reviewWarnings.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {reviewWarnings.map((warning) => (
              <Badge key={warning} tone="warning">{warning}</Badge>
            ))}
          </div>
        ) : null}
      </section> : null}

      <section className="rounded-2xl border border-line bg-canvas/60 p-3">
        {!manualMode ? <button
          type="button"
          className="focus-ring flex w-full items-center justify-between rounded-2xl px-2 py-2 text-left text-sm font-semibold text-ink"
          onClick={() => setEditDetails((current) => !current)}
          aria-expanded={editDetails}
        >
          Edit details
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-cocoa">{editDetails ? "Close" : "Optional"}</span>
        </button> : <p className="px-2 py-2 text-sm font-semibold text-ink">Required details</p>}

        {editDetails ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {editableReviewFields.map((field) => {
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
                    <>
                      <textarea
                        id={fieldId}
                        className={`${inputClass} min-h-20`}
                        value={values[field.key] || ""}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder="Comma-separated"
                      />
                      <PresetButtons
                        options={listPresets[field.key]}
                        selected={splitList(values[field.key] || "")}
                        onSelect={(option) => setValues((current) => ({ ...current, [field.key]: joinUniqueList(current[field.key] || "", option) }))}
                      />
                    </>
                  ) : (
                    <>
                      <input
                        id={fieldId}
                        className={inputClass}
                        value={values[field.key] || ""}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.required ? "Required" : "Optional"}
                        required={field.required}
                      />
                      <PresetButtons
                        options={field.key === "subcategory" ? subtypePresets[(values.category || "tops") as WardrobeCategory] : scalarPresets[field.key]}
                        selected={values[field.key] ? [values[field.key]] : []}
                        onSelect={(option) => setValues((current) => ({ ...current, [field.key]: option }))}
                      />
                    </>
                  )}
                </FieldGroup>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className={manualMode ? "" : "grid grid-cols-1 gap-2 sm:grid-cols-2"}>
        {!manualMode ? <Button type="button" variant="secondary" onClick={() => setEditDetails((current) => !current)} disabled={disabled}>
          {editDetails ? "Hide edits" : "Edit details"}
        </Button> : null}
        <Button type="submit" className="w-full" disabled={disabled}>
          Save to closet
        </Button>
      </div>
    </form>
  );
}
