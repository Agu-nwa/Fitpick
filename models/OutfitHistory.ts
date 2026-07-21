import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const OutfitHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    outfitId: { type: Schema.Types.ObjectId, ref: "OutfitRecommendation", default: null, index: true },
    itemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    itemSignature: { type: String, required: true, maxlength: 220, index: true },
    heroItemId: { type: Schema.Types.ObjectId, ref: "WardrobeItem", default: null },
    source: {
      type: String,
      enum: ["outfit_page", "stylist_chat", "manual", "system"],
      default: "outfit_page",
      index: true
    },
    recommendationMode: { type: String, default: "todays_best", maxlength: 80, index: true },
    occasion: { type: String, default: "", trim: true, maxlength: 120, index: true },
    context: { type: Schema.Types.Mixed, default: {} },
    scoreBreakdown: { type: Schema.Types.Mixed, default: {} },
    similarityMetadata: { type: Schema.Types.Mixed, default: {} },
    generatedAt: { type: Date, default: Date.now, index: true },
    viewedAt: { type: Date, default: null },
    expandedAt: { type: Date, default: null },
    savedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    swappedAt: { type: Date, default: null },
    wornAt: { type: Date, default: null },
    sharedAt: { type: Date, default: null },
    virtualTryOnGeneratedAt: { type: Date, default: null },
    feedbackReason: { type: String, default: "", trim: true, maxlength: 500 },
    feedbackRating: { type: Number, default: null, min: 1, max: 5 },
    ignored: { type: Boolean, default: false }
  },
  { timestamps: true }
);

OutfitHistorySchema.index({ userId: 1, itemSignature: 1, generatedAt: -1 });
OutfitHistorySchema.index({ userId: 1, recommendationMode: 1, generatedAt: -1 });
OutfitHistorySchema.index({ userId: 1, wornAt: -1 });

export type OutfitHistoryDocument = InferSchemaType<typeof OutfitHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OutfitHistory =
  (mongoose.models.OutfitHistory as Model<OutfitHistoryDocument>) ||
  mongoose.model<OutfitHistoryDocument>("OutfitHistory", OutfitHistorySchema);
