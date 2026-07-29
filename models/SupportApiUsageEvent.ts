import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportApiUsageEventSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    apiKeyId: { type: Schema.Types.ObjectId, ref: "SupportApiKey", required: true, index: true },
    operation: { type: String, required: true, trim: true, maxlength: 120, index: true },
    method: { type: String, required: true, trim: true, maxlength: 12 },
    path: { type: String, required: true, trim: true, maxlength: 240 },
    statusCode: { type: Number, required: true, min: 100, max: 599 },
    billableUnits: { type: Number, default: 1, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

SupportApiUsageEventSchema.index({ tenantId: 1, createdAt: -1 });
SupportApiUsageEventSchema.index({ tenantId: 1, operation: 1, createdAt: -1 });
SupportApiUsageEventSchema.index({ apiKeyId: 1, createdAt: -1 });

export type SupportApiUsageEventDocument = InferSchemaType<typeof SupportApiUsageEventSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportApiUsageEvent =
  (mongoose.models.SupportApiUsageEvent as Model<SupportApiUsageEventDocument>) ||
  mongoose.model<SupportApiUsageEventDocument>("SupportApiUsageEvent", SupportApiUsageEventSchema);
