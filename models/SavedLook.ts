import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SavedLookSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    outfitId: { type: Schema.Types.ObjectId, ref: "OutfitRecommendation" },
    source: { type: String, enum: ["manual", "ai_saved"], default: "ai_saved", index: true },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    occasion: { type: String, default: "" },
    itemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    favorite: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    savedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

SavedLookSchema.index({ userId: 1, outfitId: 1 }, { unique: true, partialFilterExpression: { outfitId: { $exists: true } } });
SavedLookSchema.index({ userId: 1, favorite: 1 });
SavedLookSchema.index({ userId: 1, savedAt: -1 });

export type SavedLookDocument = InferSchemaType<typeof SavedLookSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SavedLook =
  (mongoose.models.SavedLook as Model<SavedLookDocument>) ||
  mongoose.model<SavedLookDocument>("SavedLook", SavedLookSchema);
