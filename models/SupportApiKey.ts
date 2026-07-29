import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportApiKeySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    keyPrefix: { type: String, required: true, trim: true, maxlength: 24, index: true },
    keyHash: { type: String, required: true, trim: true, maxlength: 128, select: false, unique: true },
    scopes: { type: [String], default: ["conversations:read", "conversations:write", "messages:read", "messages:write"] },
    status: { type: String, enum: ["active", "revoked"], default: "active", required: true, index: true },
    lastUsedAt: { type: Date, default: null },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true }
  },
  { timestamps: true }
);

SupportApiKeySchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export type SupportApiKeyDocument = InferSchemaType<typeof SupportApiKeySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportApiKey =
  (mongoose.models.SupportApiKey as Model<SupportApiKeyDocument>) ||
  mongoose.model<SupportApiKeyDocument>("SupportApiKey", SupportApiKeySchema);
