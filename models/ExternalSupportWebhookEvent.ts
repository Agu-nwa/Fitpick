import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ExternalSupportWebhookEventSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    eventType: { type: String, required: true, trim: true, maxlength: 120, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["queued", "delivered", "failed", "dead_letter"], default: "queued", required: true, index: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lastStatusCode: { type: Number, default: null },
    lastError: { type: String, default: "", trim: true, maxlength: 240 },
    deliveredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

ExternalSupportWebhookEventSchema.index({ tenantId: 1, status: 1, nextAttemptAt: 1 });
ExternalSupportWebhookEventSchema.index({ status: 1, nextAttemptAt: 1 });

export type ExternalSupportWebhookEventDocument = InferSchemaType<typeof ExternalSupportWebhookEventSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ExternalSupportWebhookEvent =
  (mongoose.models.ExternalSupportWebhookEvent as Model<ExternalSupportWebhookEventDocument>) ||
  mongoose.model<ExternalSupportWebhookEventDocument>("ExternalSupportWebhookEvent", ExternalSupportWebhookEventSchema);
