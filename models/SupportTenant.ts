import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportTenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80, unique: true, index: true },
    status: { type: String, enum: ["active", "paused"], default: "active", required: true, index: true },
    webhookUrl: { type: String, default: "", trim: true, maxlength: 500 },
    webhookSigningSecret: { type: String, default: "", trim: true, maxlength: 160, select: false },
    allowedOrigins: { type: [String], default: [] },
    rateLimitPerMinute: { type: Number, default: 120, min: 1, max: 5000 },
    monthlyUsageLimit: { type: Number, default: 10000, min: 0, max: 10000000 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true }
  },
  { timestamps: true }
);

export type SupportTenantDocument = InferSchemaType<typeof SupportTenantSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportTenant =
  (mongoose.models.SupportTenant as Model<SupportTenantDocument>) ||
  mongoose.model<SupportTenantDocument>("SupportTenant", SupportTenantSchema);
