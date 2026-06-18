import type { WardrobeCategory, WardrobeCondition } from "@/types/wardrobe";

export type AiTaggingProvider = "mock" | "cloudinary" | "gemini" | "openai";

export type AiSuggestedWardrobeTags = {
  name?: string;
  category?: WardrobeCategory;
  subcategory?: string;
  color?: string;
  pattern?: string;
  fabric?: string;
  fit?: string;
  formality?: string[];
  occasions?: string[];
  weather?: string[];
  condition?: WardrobeCondition;
  confidence: number;
  needsReview: boolean;
};

export type AiTaggingInput = {
  uploadId: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  suggestedTags?: Record<string, unknown>;
};

export type AiTaggingResult = {
  ok: boolean;
  provider: AiTaggingProvider;
  aiTagStatus: "completed" | "failed" | "needs-review";
  suggestedTags?: AiSuggestedWardrobeTags;
  confidence?: number;
  safeMessage?: string;
};
