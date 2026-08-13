import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const FashionMemoryMetadataSchema = new Schema(
  {
    colors: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    brands: { type: [String], default: [] },
    fits: { type: [String], default: [] },
    formality: { type: Number, default: null },
    eventContext: { type: [String], default: [] },
    season: { type: [String], default: [] },
    weather: { type: [String], default: [] }
  },
  { _id: false }
);

const FashionMemoryContextSchema = new Schema(
  {
    occasion: { type: String, default: "", trim: true, maxlength: 120 },
    formality: { type: String, default: "", trim: true, maxlength: 40 },
    weather: { type: [String], default: [] },
    activityLevel: { type: String, default: "", trim: true, maxlength: 40 },
    timeOfDay: { type: String, default: "", trim: true, maxlength: 40 }
  },
  { _id: false }
);

const FashionMemorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "outfit_liked",
        "outfit_disliked",
        "outfit_saved",
        "outfit_rejected",
        "item_worn",
        "item_favorited",
        "item_hidden",
        "recommendation_clicked",
        "stylist_feedback",
        "manual_preference"
      ],
      required: true,
      index: true
    },
    itemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    outfitId: { type: Schema.Types.ObjectId, ref: "OutfitRecommendation", default: null },
    recommendationId: { type: Schema.Types.ObjectId, ref: "OutfitRecommendation", default: null },
    occasion: { type: String, default: null, trim: true, maxlength: 120 },
    feedbackText: { type: String, default: null, trim: true, maxlength: 500 },
    feedbackTags: { type: [String], default: [] },
    sentiment: { type: String, enum: ["positive", "negative", "neutral"], default: "neutral" },
    scope: { type: String, enum: ["outfit", "item", "attribute"], default: "outfit" },
    attribute: { type: String, default: "", trim: true, maxlength: 80 },
    attributeValue: { type: String, default: "", trim: true, maxlength: 120 },
    confidence: { type: Number, default: 0.5, min: 0, max: 1 },
    evidenceWeight: { type: Number, default: 1, min: 0, max: 5 },
    context: { type: FashionMemoryContextSchema, default: () => ({}) },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    rating: { type: Number, default: null, min: 1, max: 5 },
    metadata: { type: FashionMemoryMetadataSchema, default: () => ({}) },
    source: {
      type: String,
      enum: ["outfit_ui", "stylist_chat", "wardrobe_detail", "recommendation_engine", "style_profile"],
      required: true
    }
  },
  { timestamps: true }
);

FashionMemorySchema.index({ userId: 1, type: 1 });
FashionMemorySchema.index({ userId: 1, createdAt: -1 });
FashionMemorySchema.index({ userId: 1, revokedAt: 1, createdAt: -1 });

export type FashionMemoryDocument = InferSchemaType<typeof FashionMemorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FashionMemory =
  (mongoose.models.FashionMemory as Model<FashionMemoryDocument>) ||
  mongoose.model<FashionMemoryDocument>("FashionMemory", FashionMemorySchema);
