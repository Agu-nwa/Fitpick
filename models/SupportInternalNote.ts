import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SupportInternalNoteSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "SupportConversation", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 }
  },
  { timestamps: true }
);

SupportInternalNoteSchema.index({ conversationId: 1, createdAt: -1 });

export type SupportInternalNoteDocument = InferSchemaType<typeof SupportInternalNoteSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SupportInternalNote =
  (mongoose.models.SupportInternalNote as Model<SupportInternalNoteDocument>) ||
  mongoose.model<SupportInternalNoteDocument>("SupportInternalNote", SupportInternalNoteSchema);
