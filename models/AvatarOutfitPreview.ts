import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AvatarOutfitPreviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    outfitId: { type: Schema.Types.ObjectId, ref: "OutfitRecommendation", required: true, index: true },
    avatarProfileId: { type: Schema.Types.ObjectId, ref: "AvatarProfile", required: true, index: true },
    itemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    status: {
      type: String,
      enum: ["not_started", "generating", "ready", "failed"],
      default: "not_started",
      index: true
    },
    provider: { type: String, enum: ["s3"], default: "s3" },
    storageKey: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    cacheKey: { type: String, required: true, index: true },
    promptVersion: { type: String, default: "" },
    model: { type: String, default: "" },
    visualizationStyle: { type: String, enum: ["minimal", "luxury", "streetwear", "editorial"], default: "luxury" },
    posePreset: { type: String, enum: ["standing", "walking", "editorial", "runway", "casual"], default: "standing" },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    generatedAt: { type: Date, default: null },
    errorMessage: { type: String, default: "", maxlength: 240 },
    format: { type: String, default: "png" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 }
  },
  { timestamps: true }
);

AvatarOutfitPreviewSchema.index({ userId: 1, outfitId: 1 });
AvatarOutfitPreviewSchema.index({ userId: 1, cacheKey: 1 }, { unique: true });
AvatarOutfitPreviewSchema.index({ status: 1, updatedAt: 1 });

export type AvatarOutfitPreviewDocument = InferSchemaType<typeof AvatarOutfitPreviewSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AvatarOutfitPreview =
  (mongoose.models.AvatarOutfitPreview as Model<AvatarOutfitPreviewDocument>) ||
  mongoose.model<AvatarOutfitPreviewDocument>("AvatarOutfitPreview", AvatarOutfitPreviewSchema);
