import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const OutfitRecommendationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    occasionId: { type: Schema.Types.ObjectId, ref: "Occasion" },
    title: { type: String, default: "" },
    occasion: { type: String, default: "" },
    itemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    referenceItemIds: { type: [{ type: Schema.Types.ObjectId, ref: "ReferenceFashionItem" }], default: [] },
    outfitPieces: { type: Schema.Types.Mixed, default: [] },
    referenceItems: { type: Schema.Types.Mixed, default: [] },
    confidence: { type: String, enum: ["Strong match", "Good match", "Needs review"], default: "Needs review" },
    reasonChips: { type: [String], default: [] },
    summary: { type: String, default: "" },
    weatherContext: { type: String, default: "" },
    repetitionNote: { type: String, default: "" },
    careNote: { type: String, default: "" },
    colorNote: { type: String, default: "" },
    occasionFit: { type: String, default: "" },
    whyItWorks: { type: String, default: "" },
    materialNote: { type: String, default: "" },
    silhouetteNote: { type: String, default: "" },
    improvementNote: { type: String, default: "" },
    addLater: { type: String, default: "" },
    stylingTips: { type: [String], default: [] },
    recommendationMode: { type: String, default: "todays_best", maxlength: 80, index: true },
    styleIntent: { type: String, default: "", maxlength: 120 },
    freshnessCue: { type: String, default: "", maxlength: 180 },
    wardrobeReadiness: { type: Schema.Types.Mixed, default: null },
    gapInsights: { type: Schema.Types.Mixed, default: [] },
    scoreBreakdown: { type: Schema.Types.Mixed, default: {} },
    similarityMetadata: { type: Schema.Types.Mixed, default: {} },
    candidateCount: { type: Number, default: 0, min: 0 },
    diverseCandidateCount: { type: Number, default: 0, min: 0 },
    alternatives: { type: Schema.Types.Mixed, default: [] },
    confidenceScore: { type: Number, default: 0 },
    completenessStatus: {
      type: String,
      enum: ["complete", "missing_footwear", "missing_bottom", "missing_core_item"],
      default: "missing_core_item",
      index: true
    },
    missingCategories: { type: [String], default: [] },
    completenessWarnings: { type: [String], default: [] },
    footwearIncluded: { type: Boolean, default: false },
    preview: {
      status: {
        type: String,
        enum: ["not_started", "generating", "ready", "failed"],
        default: "not_started"
      },
      provider: { type: String, default: "" },
      storageKey: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      cacheKey: { type: String, default: "" },
      generationId: { type: String, default: "" },
      billingStatus: { type: String, default: "pending" },
      promptVersion: { type: String, default: "" },
      model: { type: String, default: "" },
      groundedItemIds: { type: [String], default: [] },
      missingVisualItemIds: { type: [String], default: [] },
      visualizationWarnings: { type: [String], default: [] },
      footwearIncluded: { type: Boolean, default: false },
      visualGroundingStatus: {
        type: String,
        enum: ["grounded", "partially_grounded", "missing_references", "failed"],
        default: "partially_grounded"
      },
      generatedAt: { type: Date, default: null },
      errorMessage: { type: String, default: "" },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null }
    },
    swapGroups: { type: Schema.Types.Mixed, default: [] },
    source: {
      type: String,
      enum: ["rule_based", "manual", "ai", "outfit_page", "stylist_chat", "system"],
      default: "rule_based",
      index: true
    },
    requestText: { type: String, default: "", maxlength: 220 },
    reuseKey: { type: String, default: "", maxlength: 96, index: true },
    reasoningMetadata: { type: Schema.Types.Mixed, default: {} },
    savedAt: { type: Date, default: null, index: true },
    favorite: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

OutfitRecommendationSchema.index({ userId: 1, occasion: 1 });
OutfitRecommendationSchema.index({ userId: 1, createdAt: -1 });
OutfitRecommendationSchema.index({ userId: 1, source: 1, reuseKey: 1 });
OutfitRecommendationSchema.index({ userId: 1, recommendationMode: 1, createdAt: -1 });
OutfitRecommendationSchema.index({ userId: 1, savedAt: -1 });
OutfitRecommendationSchema.index({ userId: 1, referenceItemIds: 1, createdAt: -1 });

export type OutfitRecommendationDocument = InferSchemaType<typeof OutfitRecommendationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OutfitRecommendation =
  (mongoose.models.OutfitRecommendation as Model<OutfitRecommendationDocument>) ||
  mongoose.model<OutfitRecommendationDocument>("OutfitRecommendation", OutfitRecommendationSchema);
