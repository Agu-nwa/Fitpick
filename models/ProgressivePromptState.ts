import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProgressivePromptStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    triggerId: { type: String, required: true, trim: true, maxlength: 120, index: true },
    status: {
      type: String,
      enum: ["eligible", "shown", "dismissed", "completed"],
      default: "eligible",
      index: true
    },
    shownCount: { type: Number, default: 0, min: 0 },
    dismissedCount: { type: Number, default: 0, min: 0 },
    lastShownAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    context: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

ProgressivePromptStateSchema.index({ userId: 1, triggerId: 1 }, { unique: true });

export type ProgressivePromptStateDocument = InferSchemaType<typeof ProgressivePromptStateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProgressivePromptState =
  (mongoose.models.ProgressivePromptState as Model<ProgressivePromptStateDocument>) ||
  mongoose.model<ProgressivePromptStateDocument>("ProgressivePromptState", ProgressivePromptStateSchema);
