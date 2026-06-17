import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ContentRuleSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    key: { type: String, required: true, index: true },
    label: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

ContentRuleSchema.index({ type: 1, key: 1 }, { unique: true });

export type ContentRuleDocument = InferSchemaType<typeof ContentRuleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ContentRule =
  (mongoose.models.ContentRule as Model<ContentRuleDocument>) ||
  mongoose.model<ContentRuleDocument>("ContentRule", ContentRuleSchema);
