import mongoose, { Schema } from "mongoose";

const OutfitPreviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    outfitId: {
      type: Schema.Types.ObjectId,
      ref: "OutfitRecommendation",
      required: true
    },

    imageUrl: {
      type: String,
      required: true
    },

    provider: {
      type: String,
      default: "openai"
    }
  },
  {
    timestamps: true
  }
);

export const OutfitPreview =
  mongoose.models.OutfitPreview ||
  mongoose.model(
    "OutfitPreview",
    OutfitPreviewSchema
  );