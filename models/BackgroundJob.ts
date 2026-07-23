import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const jobTypes = [
  "wardrobe_analysis",
  "wardrobe_enrichment",
  "label_ocr",
  "outfit_preview_generation",
  "avatar_preview_generation",
  "garment_asset_generation",
  "fit_locked_preview_generation",
  "true_3d_tryon_generation",
  "style_profile_learning",
  "memory_rollup"
] as const;

const jobStatuses = ["queued", "processing", "completed", "failed", "cancelled", "dead_letter"] as const;

const BackgroundJobSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: jobTypes, required: true, index: true },
    status: { type: String, enum: jobStatuses, default: "queued", index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed, default: {} },
    errorMessage: { type: String, default: "", maxlength: 240 },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    availableAt: { type: Date, default: Date.now, index: true },
    claimedBy: { type: String, default: "", trim: true, maxlength: 120, index: true },
    lockedAt: { type: Date, default: null },
    lockExpiresAt: { type: Date, default: null, index: true },
    lastHeartbeatAt: { type: Date, default: null },
    queueWaitMs: { type: Number, default: 0, min: 0 },
    processingDurationMs: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    deadLetteredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

BackgroundJobSchema.index({ status: 1, availableAt: 1 });
BackgroundJobSchema.index({ status: 1, lockExpiresAt: 1 });
BackgroundJobSchema.index({ userId: 1, createdAt: -1 });
BackgroundJobSchema.index({ type: 1, status: 1 });

export type BackgroundJobDocument = InferSchemaType<typeof BackgroundJobSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BackgroundJob =
  (mongoose.models.BackgroundJob as Model<BackgroundJobDocument>) ||
  mongoose.model<BackgroundJobDocument>("BackgroundJob", BackgroundJobSchema);
