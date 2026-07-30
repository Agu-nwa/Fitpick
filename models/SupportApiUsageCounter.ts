import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportApiUsageCounterSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    periodKey: { type: String, required: true, trim: true, maxlength: 7, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    usedUnits: { type: Number, default: 0, min: 0 },
    limitSnapshot: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

SupportApiUsageCounterSchema.index({ tenantId: 1, periodKey: 1 }, { unique: true });

export type SupportApiUsageCounterDocument = InferSchemaType<typeof SupportApiUsageCounterSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportApiUsageCounter =
  (mongoose.models.SupportApiUsageCounter as Model<SupportApiUsageCounterDocument>) ||
  mongoose.model<SupportApiUsageCounterDocument>("SupportApiUsageCounter", SupportApiUsageCounterSchema);
