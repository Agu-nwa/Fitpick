import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PrivacyRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["access", "correction", "objection", "deletion", "withdrawal"], required: true, index: true },
  status: { type: String, enum: ["received", "in_review", "waiting_for_user", "completed", "rejected"], default: "received", index: true },
  details: { type: String, default: "", trim: true, maxlength: 2000 },
  responseSummary: { type: String, default: "", trim: true, maxlength: 2000 },
  policyVersion: { type: String, required: true, maxlength: 80 },
  requestedAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

PrivacyRequestSchema.index({ userId: 1, createdAt: -1 });

export type PrivacyRequestDocument = InferSchemaType<typeof PrivacyRequestSchema> & { _id: mongoose.Types.ObjectId };
export const PrivacyRequest = (mongoose.models.PrivacyRequest as Model<PrivacyRequestDocument>) || mongoose.model<PrivacyRequestDocument>("PrivacyRequest", PrivacyRequestSchema);
