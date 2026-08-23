import { openai } from "@/lib/ai/openai";
import { extractLabelMetadata, type DedicatedLabelExtraction } from "@/lib/ai/ocr-label-extraction";
import { aiCache, createCacheKey } from "@/lib/ai/cache/ai-cache";
import { getAiModel } from "@/lib/ai/models/registry";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { buildWardrobeAnalysisPrompt } from "@/lib/ai/prompts";
import { safeAIError } from "@/lib/ai/safety/ai-safety";
import { wardrobeAiAnalysisSchema, type WardrobeAiAnalysis } from "@/lib/ai/schemas/wardrobe-ai.schema";
import { sanitizeCategorySpecificMetadata } from "@/lib/wardrobe/metadata-validation";
import { safeParseJson, validateJsonResponse } from "@/lib/ai/validation/response-validator";
import { resolveGarmentEntity, serializeEntityRecognition } from "@/lib/garment-intelligence/entity-resolver";
import { buildImageQualityIntelligence, mergeUploadIntelligence } from "@/lib/wardrobe/compatibility/compatibility-graph";
import type { AiSuggestedWardrobeTags, AiTaggingInput, AiTaggingResult } from "@/types/ai-tagging";

function averageConfidence(analysis: WardrobeAiAnalysis) {
  const fields = Object.values(analysis.fields);
  if (!fields.length) return 0;
  return fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length;
}

function safeScoreField(field: unknown) {
  if (!field || typeof field !== "object" || Array.isArray(field)) return field;
  const candidate = field as Record<string, unknown>;
  const rawValue = candidate.value;
  const value = Array.isArray(rawValue)
    ? rawValue.map((entry) => String(entry || "").trim()).filter(Boolean).slice(0, 5).join(", ") || null
    : typeof rawValue === "number" && Number.isFinite(rawValue)
      ? String(rawValue)
      : rawValue;
  return { ...candidate, value };
}

function safeConfidenceRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([key, raw]) => {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? [[key, Math.max(0, Math.min(1, numeric))]] : [];
  }));
}

export function prepareWardrobeAnalysisCandidate(value: unknown, selectedCategory?: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const candidate = value as Record<string, any>;
  const fields = candidate.fields && typeof candidate.fields === "object" && !Array.isArray(candidate.fields)
    ? { ...candidate.fields }
    : candidate.fields;
  if (fields) {
    fields.formalityScore = safeScoreField(fields.formalityScore);
    fields.luxuryScore = safeScoreField(fields.luxuryScore);
  }
  const detectedCategory = selectedCategory || String(fields?.category?.value || "");
  return {
    ...candidate,
    fields,
    categorySpecificMetadata: sanitizeCategorySpecificMetadata(candidate.categorySpecificMetadata, detectedCategory),
    categorySpecificMetadataConfidence: safeConfidenceRecord(candidate.categorySpecificMetadataConfidence)
  };
}

function basicFieldValue(candidate: any, key: string) {
  return candidate?.fields?.[key]?.value;
}

function basicText(value: unknown, max = 80) {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function basicList(value: unknown) {
  if (Array.isArray(value)) return value.map((entry) => basicText(entry)).filter(Boolean).slice(0, 12);
  const text = basicText(value, 240);
  return text ? text.split(",").map((entry) => entry.trim()).filter(Boolean).slice(0, 12) : [];
}

function buildBasicWardrobeFallback(candidate: any, input: AiTaggingInput): AiTaggingResult | null {
  const allowedCategories = new Set(["tops", "bottoms", "dresses", "native", "outerwear", "shoes", "bags", "accessories", "womens_hair"]);
  const detectedCategory = basicText(input.selectedCategory || basicFieldValue(candidate, "category")).toLowerCase();
  const category = allowedCategories.has(detectedCategory) ? detectedCategory as AiSuggestedWardrobeTags["category"] : undefined;
  const subcategory = basicText(input.selectedCategoryLabel || basicFieldValue(candidate, "subcategory") || basicFieldValue(candidate, "garmentType"));
  const color = basicText(basicFieldValue(candidate, "primaryColor"), 60);
  if (!category && !subcategory && !color) return null;

  const confidenceValues = ["category", "subcategory", "garmentType", "primaryColor", "pattern", "fabricEstimate", "fit"]
    .map((key) => Number(candidate?.fields?.[key]?.confidence))
    .filter((value) => Number.isFinite(value));
  const confidence = confidenceValues.length
    ? Math.max(0, Math.min(0.79, confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length))
    : 0.45;
  const brand = basicText(basicFieldValue(candidate, "brand"));
  const name = [brand, color, subcategory || category].filter(Boolean).join(" ").trim().slice(0, 120);

  return {
    ok: true,
    provider: "openai",
    aiTagStatus: "needs-review",
    confidence,
    suggestedTags: {
      ...(name ? { name } : {}),
      ...(category ? { category } : {}),
      subcategory,
      color,
      pattern: basicText(basicFieldValue(candidate, "pattern"), 60),
      fabric: basicText(basicFieldValue(candidate, "fabricEstimate") || basicFieldValue(candidate, "fabricComposition"), 60),
      fit: basicText(basicFieldValue(candidate, "fit") || basicFieldValue(candidate, "garmentFit"), 60),
      formality: basicList(basicFieldValue(candidate, "formalityScore")),
      occasions: basicList(basicFieldValue(candidate, "occasionSuitability")),
      weather: basicList(basicFieldValue(candidate, "weatherSuitability")),
      confidence,
      needsReview: true
    }
  };
}

function withReviewWarning(analysis: WardrobeAiAnalysis, warning: string) {
  if (analysis.labelWarnings.includes(warning)) return analysis;
  return {
    ...analysis,
    labelWarnings: [...analysis.labelWarnings, warning].slice(0, 10)
  };
}

function mergeTextField<T extends "size" | "brand" | "fabricComposition" | "rawLabelText" | "countryOfOrigin">(
  analysis: WardrobeAiAnalysis,
  field: T,
  ocr: DedicatedLabelExtraction[T]
) {
  const current = analysis.fields[field];
  if (!ocr.value || ocr.confidence <= current.confidence) {
    return ocr.confidence > 0 && ocr.confidence < 0.65
      ? withReviewWarning(analysis, `${field} label confidence is low; user review required.`)
      : analysis;
  }

  return {
    ...analysis,
    fields: {
      ...analysis.fields,
      [field]: ocr
    }
  };
}

function mergeCareInstructions(analysis: WardrobeAiAnalysis, ocr: DedicatedLabelExtraction["careInstructions"]) {
  const current = analysis.fields.careInstructions;
  if (!ocr.value.length || ocr.confidence <= current.confidence) {
    return ocr.confidence > 0 && ocr.confidence < 0.65
      ? withReviewWarning(analysis, "careInstructions label confidence is low; user review required.")
      : analysis;
  }

  return {
    ...analysis,
    fields: {
      ...analysis.fields,
      careInstructions: ocr
    }
  };
}

function mergeLabelExtraction(analysis: WardrobeAiAnalysis, extraction?: DedicatedLabelExtraction) {
  if (!extraction) return analysis;

  let merged = analysis;
  merged = mergeTextField(merged, "rawLabelText", extraction.rawLabelText);
  merged = mergeTextField(merged, "size", extraction.size);
  merged = mergeTextField(merged, "brand", extraction.brand);
  merged = mergeTextField(merged, "fabricComposition", extraction.fabricComposition);
  merged = mergeTextField(merged, "countryOfOrigin", extraction.countryOfOrigin);
  merged = mergeCareInstructions(merged, extraction.careInstructions);

  return {
    ...merged,
    labelWarnings: [...merged.labelWarnings, ...extraction.warnings].slice(0, 10)
  };
}

function mergeEntityRecognition(analysis: WardrobeAiAnalysis, extraction?: DedicatedLabelExtraction) {
  try {
    const resolved = serializeEntityRecognition(resolveGarmentEntity(analysis, extraction));
    const fields = { ...analysis.fields } as any;

    for (const [key, resolvedField] of Object.entries(resolved)) {
      const current = fields[key];
      if (Array.isArray((resolvedField as any).value)) {
        const mergedValues = Array.from(new Set([...(current?.value || []), ...((resolvedField as any).value || [])])).slice(0, 20);
        fields[key] = {
          ...resolvedField,
          value: mergedValues,
          confidence: Math.max(current?.confidence || 0, (resolvedField as any).confidence || 0)
        };
        continue;
      }

      if ((resolvedField as any).value !== null && ((resolvedField as any).confidence || 0) >= (current?.confidence || 0)) {
        fields[key] = resolvedField;
      }
    }

    const entityWarnings = (fields.entityWarnings?.value || []) as string[];
    return {
      ...analysis,
      fields,
      labelWarnings: [...analysis.labelWarnings, ...entityWarnings].slice(0, 10)
    };
  } catch {
    return withReviewWarning(analysis, "Advanced garment recognition is unavailable; please verify manually.");
  }
}

function metadataText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim().slice(0, 120);
    if (text) return text;
  }
  return "";
}

function metadataList(...values: unknown[]) {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const list = value
      .map((item) => (typeof item === "string" ? item.trim().slice(0, 80) : ""))
      .filter(Boolean)
      .slice(0, 12);
    if (list.length) return list;
  }
  return [];
}

function applyUserIntakeMetadata(analysis: WardrobeAiAnalysis, input: AiTaggingInput) {
  const userInput = input.userInputMetadata || {};
  const recommendation = input.recommendationMetadata || {};
  const virtualTryOn = input.virtualTryOnMetadata || {};
  const fields = { ...analysis.fields };

  const setText = (field: keyof typeof fields, value: string) => {
    if (!value) return;
    (fields as any)[field] = {
      ...(fields as any)[field],
      value,
      confidence: Math.max((fields as any)[field]?.confidence || 0, 0.9),
      source: "user_confirmed"
    };
  };

  const setList = (field: keyof typeof fields, value: string[]) => {
    if (!value.length) return;
    (fields as any)[field] = {
      ...(fields as any)[field],
      value,
      confidence: Math.max((fields as any)[field]?.confidence || 0, 0.9),
      source: "user_confirmed"
    };
  };

  setText("primaryColor", metadataText(userInput.primaryColor, userInput.color, recommendation.primaryColor));
  setText("fit", metadataText(userInput.fit, recommendation.fit, virtualTryOn.fit));
  setText("formalityScore", metadataText(userInput.formality, recommendation.formality));
  setList("occasionSuitability", metadataList(userInput.occasions, recommendation.occasions));
  setList("weatherSuitability", metadataList(userInput.weather, recommendation.weather));
  setText("fabricEstimate", metadataText(userInput.fabric, userInput.material, recommendation.material));
  setText("size", metadataText(userInput.size, virtualTryOn.size));
  setText("brand", metadataText(userInput.brand));

  return {
    ...analysis,
    fields
  };
}

export function analysisToSuggestedTags(analysis: WardrobeAiAnalysis): AiSuggestedWardrobeTags {
  const fields = analysis.fields;
  const confidence = averageConfidence(analysis);
  const entityName = fields.recognizedEntity.value && fields.recognizedEntity.confidence >= 0.65
    ? fields.recognizedEntity.value
    : "";

  return {
    name: entityName || [fields.primaryColor.value, fields.garmentType.value].filter(Boolean).join(" ").trim() || undefined,
    category: fields.category.value || undefined,
    subcategory: fields.subcategory.value || fields.garmentType.value || (fields.sportCategory.value ? "jersey" : ""),
    color: fields.primaryColor.value || "",
    pattern: fields.pattern.value || "",
    fabric: fields.fabricComposition.value || fields.fabricEstimate.value || "",
    fit: fields.fit.value || "",
    formality: fields.formalityScore.value ? [fields.formalityScore.value] : [],
    occasions: fields.occasionSuitability.value,
    weather: fields.weatherSuitability.value,
    taggedSize: fields.taggedSize.value || "unknown",
    sizeSystem: fields.sizeSystem.value || "unknown",
    garmentFit: fields.garmentFit.value || "unknown",
    stretchLevel: fields.stretchLevel.value || "unknown",
    fabricDrape: fields.fabricDrape.value || "unknown",
    fitConfidence: fields.fitConfidence.value ?? fields.fit.confidence ?? 0,
    measurementSource: fields.measurementSource.value || (fields.size.source === "ocr" ? "label_ocr" : "ai_estimated"),
    confidence,
    needsReview: true
  };
}

function categoryConstraint(input: AiTaggingInput) {
  const selected = input.selectedCategory;
  if (!selected) return undefined;
  return selected;
}

function applySelectedCategory(analysis: WardrobeAiAnalysis, input: AiTaggingInput) {
  if (!input.selectedCategory) return analysis;
  return {
    ...analysis,
    fields: {
      ...analysis.fields,
      category: {
        value: input.selectedCategory,
        confidence: 1,
        source: "user_confirmed" as const
      },
      subcategory: input.selectedCategoryLabel
        ? {
            value: input.selectedCategoryLabel,
            confidence: 1,
            source: "user_confirmed" as const
          }
        : analysis.fields.subcategory
    }
  };
}

export async function analyzeWardrobeImages(input: AiTaggingInput): Promise<AiTaggingResult> {
  const model = getAiModel("wardrobeVision");
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      provider: "openai",
      aiTagStatus: "failed",
      safeMessage: "OpenAI API key is missing.",
      failureCode: "configuration"
    };
  }

  const imageEntries = [
    { label: "front view", url: input.imageUrl },
    ...(input.images?.front?.url ? [{ label: "front view", url: input.images.front.url }] : []),
    ...(input.images?.back?.url ? [{ label: "back view", url: input.images.back.url }] : []),
    ...(input.images?.fabricCloseUp?.url ? [{ label: "fabric close-up", url: input.images.fabricCloseUp.url }] : []),
    ...(input.images?.label?.url ? [{ label: "care and size label", url: input.images.label.url }] : [])
  ].filter((entry, index, all) => entry.url && all.findIndex((candidate) => candidate.url === entry.url) === index);

  if (!imageEntries.length) {
    return {
      ok: false,
      provider: "openai",
      aiTagStatus: "failed",
      safeMessage: "Upload image details are not available for analysis.",
      failureCode: "missing_image"
    };
  }

  const cacheKey = createCacheKey("wardrobe-analysis", {
    model,
    images: [
      input.storageKey,
      input.images?.front?.storageKey || input.images?.front?.url,
      input.images?.back?.storageKey || input.images?.back?.url,
      input.images?.fabricCloseUp?.storageKey || input.images?.fabricCloseUp?.url,
      input.images?.label?.storageKey || input.images?.label?.url,
      input.selectedCategory,
      input.selectedCategoryLabel
    ].filter(Boolean)
  });
  const cached = await aiCache.get<AiTaggingResult>(cacheKey);
  if (cached) {
    logAiEvent({ operation: "wardrobe-analysis", model, latencyMs: 0, status: "success", cacheHit: true });
    return cached;
  }

  const startedAt = Date.now();
  let failureStage: NonNullable<AiTaggingResult["failureCode"]> = "provider_request";
  try {
    const response = await openai.responses.create({
      model,
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildWardrobeAnalysisPrompt({
                selectedCategory: input.selectedCategory,
                selectedCategoryLabel: input.selectedCategoryLabel,
                userInputMetadata: input.userInputMetadata,
                recommendationMetadata: input.recommendationMetadata,
                virtualTryOnMetadata: input.virtualTryOnMetadata
              })
            },
            ...imageEntries.flatMap((entry) => [
              { type: "input_text" as const, text: `Image purpose: ${entry.label}` },
              { type: "input_image" as const, image_url: entry.url || "", detail: "auto" as const }
            ])
          ]
        }
      ]
    });

    failureStage = "json_parse";
    const json = safeParseJson(response.output_text || "{}");
    if (!json.ok) throw new Error(json.reason);
    failureStage = "schema_validation";
    const preparedCandidate = prepareWardrobeAnalysisCandidate(json.data, input.selectedCategory);
    const validated = validateJsonResponse(wardrobeAiAnalysisSchema.partial({ provider: true, model: true, status: true }), preparedCandidate);
    if (!validated.ok) {
      logAiEvent({
        operation: "wardrobe-analysis-full",
        model,
        latencyMs: Date.now() - startedAt,
        status: "failed",
        errorCategory: "schema_validation",
        validationIssue: validated.reason
      });
      const fallback = buildBasicWardrobeFallback(preparedCandidate, input);
      if (fallback) {
        logAiEvent({ operation: "wardrobe-analysis-basic-fallback", model, latencyMs: Date.now() - startedAt, status: "success", cacheHit: false });
        return fallback;
      }
      throw new Error(validated.reason);
    }

    const fallbackUploadIntelligence = buildImageQualityIntelligence({ images: input.images });
    failureStage = "final_validation";
    const visionAnalysis = wardrobeAiAnalysisSchema.parse({
      ...validated.data,
      provider: "openai",
      model,
      status: "suggested",
      categorySpecificMetadata: sanitizeCategorySpecificMetadata(
        (validated.data as any).categorySpecificMetadata || {},
        input.selectedCategory || (validated.data as any).fields?.category?.value
      ),
      uploadIntelligence: mergeUploadIntelligence((validated.data as any).uploadIntelligence, fallbackUploadIntelligence),
      labelExtractionStatus: input.images?.label?.url ? "pending" : "not_provided",
      labelWarnings: [],
      analyzedAt: new Date().toISOString()
    });

    const labelResult = await extractLabelMetadata(input.images?.label);
    const mergedAnalysis = mergeEntityRecognition(
      mergeLabelExtraction(applyUserIntakeMetadata(applySelectedCategory(visionAnalysis, input), input), labelResult.extraction),
      labelResult.extraction
    );
    const analysis = wardrobeAiAnalysisSchema.parse({
      ...mergedAnalysis,
      uploadIntelligence: mergeUploadIntelligence((mergedAnalysis as any).uploadIntelligence, fallbackUploadIntelligence),
      labelExtractionStatus: labelResult.status,
      labelWarnings: [...mergedAnalysis.labelWarnings, ...labelResult.warnings].slice(0, 10)
    });

    const suggestedTags = {
      ...analysisToSuggestedTags(analysis),
      ...(categoryConstraint(input) ? { category: categoryConstraint(input) } : {}),
      ...(input.selectedCategoryLabel ? { subcategory: input.selectedCategoryLabel } : {})
    };
    const result = {
      ok: true,
      provider: "openai",
      confidence: suggestedTags.confidence,
      aiTagStatus: suggestedTags.confidence >= 0.8 ? "completed" : "needs-review",
      suggestedTags,
      aiAnalysis: analysis
    } satisfies AiTaggingResult;
    await aiCache.set(cacheKey, result, 60 * 30);
    logAiEvent({ operation: "wardrobe-analysis", model, latencyMs: Date.now() - startedAt, status: "success", cacheHit: false });
    return result;
  } catch (error) {
    const providerCategory = errorCategory(error);
    const failureCode = failureStage === "provider_request" && providerCategory !== "Error" && providerCategory !== "unknown"
      ? providerCategory
      : failureStage;
    logAiEvent({
      operation: "wardrobe-analysis",
      model,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      errorCategory: failureCode,
      validationIssue: failureStage === "schema_validation" && error instanceof Error ? error.message : ""
    });
    return {
      ok: false,
      provider: "openai",
      aiTagStatus: "failed",
      safeMessage: safeAIError(error),
      failureCode: failureCode as AiTaggingResult["failureCode"]
    };
  }
}
