import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportAttachmentSchema = new Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 500 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    filename: { type: String, required: true, trim: true, maxlength: 160 },
    mimeType: { type: String, enum: ["image/jpeg", "image/webp"], required: true },
    size: { type: Number, required: true, min: 1 },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const SupportMessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "SupportConversation", required: true, index: true },
    senderType: { type: String, enum: ["user", "support"], required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, default: "", trim: true, maxlength: 4000 },
    attachments: { type: [SupportAttachmentSchema], default: [] },
    readAt: { type: Date, default: null, index: true },
    idempotencyKey: { type: String, default: "", trim: true, maxlength: 100, select: false }
  },
  { timestamps: true }
);

SupportMessageSchema.index({ conversationId: 1, createdAt: -1 });
SupportMessageSchema.index({ conversationId: 1, readAt: 1, senderType: 1 });
SupportMessageSchema.index(
  { conversationId: 1, senderType: 1, senderId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string", $gt: "" } }
  }
);

export type SupportMessageDocument = InferSchemaType<typeof SupportMessageSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportMessage =
  (mongoose.models.SupportMessage as Model<SupportMessageDocument>) ||
  mongoose.model<SupportMessageDocument>("SupportMessage", SupportMessageSchema);
