import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ExternalSupportConversationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "ExternalSupportCustomer", required: true, index: true },
    externalConversationId: { type: String, default: "", trim: true, maxlength: 160 },
    status: { type: String, enum: ["open", "pending", "resolved"], default: "open", required: true, index: true },
    subject: { type: String, default: "", trim: true, maxlength: 180 },
    lastMessageAt: { type: Date, default: null, index: true },
    latestMessagePreview: { type: String, default: "", trim: true, maxlength: 180 },
    customerUnreadCount: { type: Number, default: 0, min: 0 },
    agentUnreadCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

ExternalSupportConversationSchema.index({ tenantId: 1, status: 1, lastMessageAt: -1 });
ExternalSupportConversationSchema.index({ tenantId: 1, customerId: 1, status: 1, lastMessageAt: -1 });
ExternalSupportConversationSchema.index(
  { tenantId: 1, externalConversationId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalConversationId: { $type: "string", $gt: "" } }
  }
);

export type ExternalSupportConversationDocument = InferSchemaType<typeof ExternalSupportConversationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ExternalSupportConversation =
  (mongoose.models.ExternalSupportConversation as Model<ExternalSupportConversationDocument>) ||
  mongoose.model<ExternalSupportConversationDocument>("ExternalSupportConversation", ExternalSupportConversationSchema);
