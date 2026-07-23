import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const creditTransactionStatuses = [
  "pending",
  "reserved",
  "processing",
  "spent",
  "credited",
  "released",
  "reversed",
  "failed",
  "refunded"
] as const;

const CreditTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    feature: { type: String, required: true, trim: true, maxlength: 80, index: true },
    credits: { type: Number, required: true },
    status: { type: String, enum: creditTransactionStatuses, default: "pending", index: true },
    referenceId: { type: String, required: true, trim: true, maxlength: 160 },
    balanceAfter: { type: Number, default: null, min: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

CreditTransactionSchema.index({ user: 1, createdAt: -1 });
CreditTransactionSchema.index({ user: 1, feature: 1, createdAt: -1 });
CreditTransactionSchema.index({ user: 1, feature: 1, referenceId: 1 }, { unique: true });
CreditTransactionSchema.index({ feature: 1, referenceId: 1 }, { unique: true });

export type CreditTransactionDocument = InferSchemaType<typeof CreditTransactionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CreditTransaction =
  (mongoose.models.CreditTransaction as Model<CreditTransactionDocument>) ||
  mongoose.model<CreditTransactionDocument>("CreditTransaction", CreditTransactionSchema);
