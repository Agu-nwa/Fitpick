import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const tryOnGenerationStatuses = [
  "requested",
  "validating",
  "queued",
  "reserved",
  "submitting",
  "processing",
  "provider_completed",
  "downloading",
  "uploading",
  "saving",
  "completed",
  "failed",
  "cancelled",
  "expired"
] as const;

const TryOnGenerationSchema = new Schema(
  {
    generationId: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 180 },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    outfitId: { type: Schema.Types.ObjectId, ref: "OutfitRecommendation", required: true, index: true },
    avatarProfileId: { type: Schema.Types.ObjectId, ref: "AvatarProfile", default: null, index: true },
    previewId: { type: Schema.Types.ObjectId, ref: "AvatarOutfitPreview", default: null, index: true },
    cacheKey: { type: String, required: true, trim: true, maxlength: 220, index: true },
    creditFeature: { type: String, required: true, trim: true, maxlength: 80, index: true },
    creditReferenceId: { type: String, required: true, trim: true, maxlength: 180 },
    provider: { type: String, default: "", trim: true, maxlength: 80, index: true },
    providerJobId: { type: String, default: "", trim: true, maxlength: 160, index: true },
    status: { type: String, enum: tryOnGenerationStatuses, default: "requested", index: true },
    failureStage: { type: String, default: "", trim: true, maxlength: 80 },
    failureCode: { type: String, default: "", trim: true, maxlength: 80 },
    failureMessage: { type: String, default: "", trim: true, maxlength: 240 },
    previewUrl: { type: String, default: "", trim: true, maxlength: 600 },
    storageKey: { type: String, default: "", trim: true, maxlength: 512 },
    creditsReserved: { type: Number, default: 0, min: 0 },
    creditsCommitted: { type: Number, default: 0, min: 0 },
    creditsReleased: { type: Number, default: 0, min: 0 },
    retryCount: { type: Number, default: 0, min: 0 },
    durationMs: { type: Number, default: 0, min: 0 },
    stageTimestamps: { type: Schema.Types.Mixed, default: {} },
    providerDiagnostics: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

TryOnGenerationSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
TryOnGenerationSchema.index({ userId: 1, outfitId: 1, cacheKey: 1, status: 1 });
TryOnGenerationSchema.index({ userId: 1, createdAt: -1 });
TryOnGenerationSchema.index({ creditReferenceId: 1 }, { unique: true });

export type TryOnGenerationDocument = InferSchemaType<typeof TryOnGenerationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TryOnGeneration =
  (mongoose.models.TryOnGeneration as Model<TryOnGenerationDocument>) ||
  mongoose.model<TryOnGenerationDocument>("TryOnGeneration", TryOnGenerationSchema);
