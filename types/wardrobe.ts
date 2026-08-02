export type WardrobeCondition = "ready" | "needs-care" | "missing-tags";
import type { WardrobeSetComponent, WardrobeStructureRole, WardrobeStylingRole, WardrobeVisibilityRole } from "@/lib/wardrobe/canonical-taxonomy";
export type WardrobeCategory =
  | "tops"
  | "bottoms"
  | "dresses"
  | "native"
  | "outerwear"
  | "shoes"
  | "bags"
  | "accessories"
  | "womens_hair";

import type { WardrobeImageAsset } from "@/types/ai-tagging";

export type TaggedSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "custom" | "unknown";
export type SizeSystem = "US" | "UK" | "EU" | "international" | "custom" | "unknown";
export type GarmentFit = "slim" | "regular" | "relaxed" | "oversized" | "tailored" | "flowing" | "unknown";
export type StretchLevel = "none" | "low" | "medium" | "high" | "unknown";
export type FabricDrape = "structured" | "soft" | "flowing" | "heavy" | "stiff" | "unknown";
export type MeasurementSource = "label_ocr" | "user_confirmed" | "ai_estimated" | "manual" | "unknown";
export type TaxonomyStatus = "confirmed" | "inferred" | "needs_review" | "unresolved";
export type TaxonomyConfirmedBy = "user" | "ai" | "migration" | "system";

export type GarmentMeasurements = {
  chestWidthCm?: number | null;
  shoulderWidthCm?: number | null;
  sleeveLengthCm?: number | null;
  bodyLengthCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  inseamCm?: number | null;
  outseamCm?: number | null;
  shoeLengthCm?: number | null;
  heelHeightCm?: number | null;
};

export type WardrobeItem = {
  id: string;
  name: string;
  category: WardrobeCategory;
  subcategory?: string;
  canonicalSubtype?: string;
  structureRole?: WardrobeStructureRole;
  stylingRole?: WardrobeStylingRole;
  setComponents?: WardrobeSetComponent[];
  visibilityRole?: WardrobeVisibilityRole;
  occasionRange?: string[];
  formalityLevel?: string;
  taxonomyConfidence?: number;
  taxonomyEvidence?: string[];
  taxonomyNeedsReview?: boolean;
  taxonomyStatus?: TaxonomyStatus;
  taxonomyConfirmedBy?: TaxonomyConfirmedBy;
  taxonomyConfirmedAt?: string | null;
  taxonomyConflicts?: string[];
  taxonomyVersion?: string;
  color: string;
  pattern?: string;
  fabric?: string;
  fit?: string;
  taggedSize?: TaggedSize;
  sizeSystem?: SizeSystem;
  garmentFit?: GarmentFit;
  garmentMeasurements?: GarmentMeasurements;
  stretchLevel?: StretchLevel;
  fabricDrape?: FabricDrape;
  fitConfidence?: number;
  measurementSource?: MeasurementSource;
  formality: string[];
  occasions: string[];
  weather: string[];
  userInputMetadata?: Record<string, unknown>;
  categorySpecificMetadata?: Record<string, unknown>;
  ocrMetadata?: Record<string, unknown>;
  recommendationMetadata?: Record<string, unknown>;
  virtualTryOnMetadata?: Record<string, unknown>;
  searchMetadata?: Record<string, unknown>;
  normalisedMetadata?: {
    universal: Record<string, unknown>;
    specific: Record<string, unknown>;
    confidence: Record<string, number>;
    source: "structured" | "legacy" | "mixed";
  };
  enrichmentStatus?: "not_started" | "queued" | "completed" | "failed" | string;
  verifiedMetadata?: Record<string, unknown>;
  condition: WardrobeCondition;
  timesWorn?: number;
  recommendationCount?: number;
  lastRecommendedAt?: string | null;
  favoriteScore?: number;
  versatilityScore?: number;
  confidenceScore?: number;
  lastWorn?: string;
  lastWornAt?: string | null;
  archivedAt?: string | null;
  imageUrl?: string;
  thumbnailUrl?: string;
  images?: Partial<Record<"front" | "back" | "fabricCloseUp" | "label", WardrobeImageAsset>> & {
    additional?: WardrobeImageAsset[];
  };
  aiAnalysis?: unknown;
  hasImage?: boolean;
  imageTone?: string;
  recognizedEntity?: string;
};

export type WardrobeSummary = {
  totalCount: number;
  readyCount: number;
  needsCareCount: number;
  missingTagsCount: number;
  countsByCategory: Record<string, number>;
  missingEssentials: string[];
};
