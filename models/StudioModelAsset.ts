import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const studioModelAssetStatuses = ["READY", "GENERATING", "MISSING", "FAILED", "FALLBACK", "REVIEW_REQUIRED"] as const;

const StudioModelAssetSchema = new Schema({
  appearanceKey: { type: String, required: true, immutable: true, maxlength: 40 },
  assetUrl: { type: String, default: "", maxlength: 2048 },
  storageKey: { type: String, default: "", maxlength: 512 },
  thumbnailUrl: { type: String, default: "", maxlength: 2048 },
  genderPresentation: { type: String, enum: ["female", "male"], required: true },
  bodyType: { type: String, enum: ["petite", "standard", "athletic", "broad", "curvy", "plus_size", "maternity"], required: true },
  skinTone: { type: String, required: true, maxlength: 20 },
  undertone: { type: String, enum: ["cool", "neutral", "warm", ""], default: "" },
  hairTexture: { type: String, required: true, maxlength: 30 },
  hairLength: { type: String, required: true, maxlength: 20 },
  hairStyle: { type: String, required: true, maxlength: 40 },
  hairColor: { type: String, required: true, maxlength: 30 },
  heightGroup: { type: String, enum: ["short", "average", "tall", ""], default: "" },
  version: { type: String, required: true, maxlength: 40 },
  status: { type: String, enum: studioModelAssetStatuses, required: true, default: "MISSING" },
  qualityScore: { type: Number, default: 0, min: 0, max: 1 },
  hash: { type: String, default: "", maxlength: 64 },
  reviewedAt: { type: Date, default: null },
  generatedBy: { type: String, default: "", maxlength: 80 },
  provider: { type: String, default: "", maxlength: 80 },
  providerAssetId: { type: String, default: "", maxlength: 200, select: false },
  generationPromptVersion: { type: String, default: "", maxlength: 80 },
  failureCode: { type: String, default: "", maxlength: 80 },
  deprecatedAt: { type: Date, default: null },
  extensions: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

StudioModelAssetSchema.index({ appearanceKey: 1, version: 1 }, { unique: true });
StudioModelAssetSchema.index({ status: 1, updatedAt: -1 });
StudioModelAssetSchema.index({ genderPresentation: 1, bodyType: 1, version: 1, status: 1 });
StudioModelAssetSchema.index({ hash: 1 });

export type StudioModelAssetDocument = InferSchemaType<typeof StudioModelAssetSchema> & { _id: mongoose.Types.ObjectId };
export const StudioModelAsset = (mongoose.models.StudioModelAsset as Model<StudioModelAssetDocument>) || mongoose.model<StudioModelAssetDocument>("StudioModelAsset", StudioModelAssetSchema);
