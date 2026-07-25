import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["open", "pending", "resolved"], default: "open", required: true, index: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    lastMessageAt: { type: Date, default: null, index: true },
    latestMessagePreview: { type: String, default: "", trim: true, maxlength: 180 },
    userUnreadCount: { type: Number, default: 0, min: 0 },
    supportUnreadCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

SupportConversationSchema.index({ userId: 1, lastMessageAt: -1 });
SupportConversationSchema.index({ status: 1, lastMessageAt: -1 });
SupportConversationSchema.index({ assignedAgentId: 1, status: 1, lastMessageAt: -1 });
SupportConversationSchema.index({ supportUnreadCount: -1, lastMessageAt: -1 });
SupportConversationSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["open", "pending"] } }
  }
);

export type SupportConversationDocument = InferSchemaType<typeof SupportConversationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportConversation =
  (mongoose.models.SupportConversation as Model<SupportConversationDocument>) ||
  mongoose.model<SupportConversationDocument>("SupportConversation", SupportConversationSchema);
