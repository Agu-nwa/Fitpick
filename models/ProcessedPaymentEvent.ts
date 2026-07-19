import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProcessedPaymentEventSchema = new Schema(
  {
    provider: { type: String, enum: ["stripe", "coinpayments"], required: true, index: true },
    eventId: { type: String, required: true, trim: true, maxlength: 220 },
    eventType: { type: String, required: true, trim: true, maxlength: 120 },
    purchaseId: { type: Schema.Types.ObjectId, ref: "CreditPurchase" },
    processingStatus: {
      type: String,
      enum: ["received", "processing", "processed", "ignored", "failed"],
      default: "received",
      index: true
    },
    processedAt: { type: Date },
    errorCode: { type: String, trim: true, maxlength: 120 }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

ProcessedPaymentEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export type ProcessedPaymentEventDocument = InferSchemaType<typeof ProcessedPaymentEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProcessedPaymentEvent =
  (mongoose.models.ProcessedPaymentEvent as Model<ProcessedPaymentEventDocument>) ||
  mongoose.model<ProcessedPaymentEventDocument>("ProcessedPaymentEvent", ProcessedPaymentEventSchema);
