import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ExternalSupportMessageSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "ExternalSupportConversation", required: true, index: true },
    senderType: { type: String, enum: ["customer", "agent", "system"], required: true, index: true },
    senderName: { type: String, default: "", trim: true, maxlength: 160 },
    body: { type: String, default: "", trim: true, maxlength: 4000 },
    idempotencyKey: { type: String, default: "", trim: true, maxlength: 100, select: false },
    readAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

ExternalSupportMessageSchema.index({ tenantId: 1, conversationId: 1, createdAt: -1 });
ExternalSupportMessageSchema.index(
  { tenantId: 1, conversationId: 1, senderType: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } }
  }
);

export type ExternalSupportMessageDocument = InferSchemaType<typeof ExternalSupportMessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ExternalSupportMessage =
  (mongoose.models.ExternalSupportMessage as Model<ExternalSupportMessageDocument>) ||
  mongoose.model<ExternalSupportMessageDocument>("ExternalSupportMessage", ExternalSupportMessageSchema);
