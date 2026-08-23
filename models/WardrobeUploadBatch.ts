import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { WARDROBE_BATCH_MAX_ITEMS } from "@/lib/wardrobe/batch-upload";

const WardrobeUploadBatchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    uploadIds: { type: [Schema.Types.ObjectId], ref: "WardrobeUpload", required: true },
    // Creation requires 2–10 uploads, but review may remove invalid photos.
    itemCount: { type: Number, required: true, min: 0, max: WARDROBE_BATCH_MAX_ITEMS },
    status: { type: String, enum: ["processing", "review", "completed"], default: "processing", index: true }
  },
  { timestamps: true }
);

export type WardrobeUploadBatchDocument = InferSchemaType<typeof WardrobeUploadBatchSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WardrobeUploadBatch =
  (mongoose.models.WardrobeUploadBatch as Model<WardrobeUploadBatchDocument>) ||
  mongoose.model<WardrobeUploadBatchDocument>("WardrobeUploadBatch", WardrobeUploadBatchSchema);
