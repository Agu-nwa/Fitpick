import type { WardrobeItem } from "./wardrobe";

export type OutfitConfidence = "Strong match" | "Good match" | "Needs review";
export type OutfitCompletenessStatus = "complete" | "missing_footwear" | "missing_bottom" | "missing_core_item";
export type VisualGroundingStatus = "grounded" | "partially_grounded" | "missing_references" | "failed";
export type OutfitPieceSource = "wardrobe" | "reference-upload";

export type ReferenceFashionItemSummary = {
  id: string;
  conversationId?: string;
  imageUrl: string;
  source: "camera" | "upload";
  status: "uploaded" | "analyzing" | "needs-selection" | "ready" | "failed" | string;
  category?: string;
  subcategory?: string;
  primaryColor?: string;
  secondaryColors?: string[];
  pattern?: string;
  fabric?: string;
  silhouette?: string;
  fit?: string;
  formality?: string;
  styles?: string[];
  occasions?: string[];
  weather?: string[];
  seasons?: string[];
  detectedItems?: Array<{
    id: string;
    label: string;
    category?: string;
    subcategory?: string;
    primaryColor?: string;
    confidence?: number;
  }>;
  selectedDetectedItemId?: string;
  usableForMatching?: boolean;
  usableForTryOn?: boolean;
  warnings?: string[];
  analysisSummary?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  expiresAt?: string | null;
};

export type OutfitPiece = {
  source: OutfitPieceSource;
  role: string;
  wardrobeItemId?: string;
  referenceItemId?: string;
  category?: string;
  label?: string;
};

export type OutfitRecommendation = {
  id: string;
  title: string;
  occasion: string;
  confidence: OutfitConfidence;
  items: WardrobeItem[];
  outfitPieces?: OutfitPiece[];
  referenceItems?: ReferenceFashionItemSummary[];
  reasonChips: string[];
  summary: string;
  weatherFit: string;
  colorNote: string;
  occasionFit?: string;
  whyItWorks?: string;
  materialNote?: string;
  silhouetteNote?: string;
  improvementNote?: string;
  addLater?: string;
  confidenceScore?: number;
  recommendationMode?: string;
  styleIntent?: string;
  freshnessCue?: string;
  wardrobeReadiness?: Record<string, unknown> | null;
  gapInsights?: Array<{ category?: string; message?: string; unlockPotential?: number }>;
  scoreBreakdown?: Record<string, unknown>;
  similarityMetadata?: Record<string, unknown>;
  candidateCount?: number;
  diverseCandidateCount?: number;
  alternatives?: Array<{
    title: string;
    itemIds: string[];
    similarityMetadata?: Record<string, unknown>;
  }>;
  stylingTips?: string[];
  completenessStatus?: OutfitCompletenessStatus;
  missingCategories?: string[];
  completenessWarnings?: string[];
  footwearIncluded?: boolean;
  repeatNote: string;
  careNote: string;
  source?: "rule_based" | "manual" | "ai" | "outfit_page" | "stylist_chat" | "system" | string;
  savedAt?: string | null;
  favorite?: boolean;
  createdAt?: string;
  preview?: {
    status: "not_started" | "generating" | "ready" | "failed" | string;
    provider?: string;
    storageKey?: string;
    imageUrl?: string;
    cacheKey?: string;
    generationId?: string;
    billingStatus?: string;
    promptVersion?: string;
    model?: string;
    accuracyLevel?: PreviewAccuracySummary;
    fitWarnings?: string[];
    groundedItemIds?: string[];
    missingVisualItemIds?: string[];
    visualizationWarnings?: string[];
    footwearIncluded?: boolean;
    visualGroundingStatus?: VisualGroundingStatus;
    generatedAt?: string | null;
    errorMessage?: string;
    attempts?: number;
  };
  swapGroups?: Array<{
    category: string;
    itemIds: string[];
    warningChips: string[];
  }>;
};

export type WornLook = OutfitRecommendation & {
  wornOn: string;
};

export type OutfitRating = "Perfect" | "Good" | "Okay" | "Not today" | "Not my style";

export type StylistIntent =
  | "outfit_request"
  | "compare_outfits"
  | "improve_outfit"
  | "explain_item"
  | "packing_help"
  | "wardrobe_gap"
  | "general_style_advice"
  | "shopping_advice_requested"
  | "unclear";

export type StylistVisualMode = "none" | "premium_preview" | "digital_human";
export type PreviewAccuracyLevelId = "inspired_visualization" | "garment_referenced" | "fit_locked" | "true_3d_simulation";

export type PreviewAccuracySummary = {
  id: PreviewAccuracyLevelId;
  label: string;
  meaning: string;
  rank: 1 | 2 | 3 | 4;
};

export type FitLockSummary = {
  fitStatus: "unknown" | "likely_fits" | "may_be_tight" | "may_be_loose" | "oversized_intended" | "measurements_needed" | string;
  fitConfidence: number;
  warnings: string[];
  lockedFitInstructions?: string[];
  accuracyLevel?: PreviewAccuracySummary;
};

export type StylistAvatarPreview = {
  status: "not_started" | "queued" | "generating" | "ready" | "failed" | string;
  jobId: string | null;
  previewId: string | null;
  imageUrl: string | null;
  cacheKey: string | null;
  errorMessage: string | null;
  accuracyLevel?: PreviewAccuracySummary;
  fitStatus?: string;
  fitConfidence?: number;
  fitWarnings?: string[];
  groundedItemIds?: string[];
  missingVisualItemIds?: string[];
  visualizationWarnings?: string[];
  footwearIncluded?: boolean;
  visualGroundingStatus?: VisualGroundingStatus;
  progressiveTrigger?: {
    id: string;
    title: string;
    body: string;
    primaryAction: string;
    secondaryAction: string;
    value: string;
  } | null;
  setupPath?: string | null;
};

export type StylistResponse = {
  message: string;
  intent: StylistIntent;
  recommendedOutfitIds: string[];
  recommendedItemIds: string[];
  alternativeItemIds: string[];
  missingWardrobeCategories: string[];
  occasionDetected: string | null;
  confidenceScore: number;
  stylingTips: string[];
  followUpQuestions: string[];
  addLaterSuggestions: string[];
  safetyWarnings: string[];
  visualMode?: StylistVisualMode;
  outfitRecommendationId?: string | null;
  avatarPreview?: StylistAvatarPreview;
  visualizationDisclaimer?: string;
  fitLock?: FitLockSummary;
};
