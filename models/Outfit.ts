import mongoose, { Schema, models, model } from "mongoose";

const OutfitSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      default: ""
    },

    occasion: {
      type: String,
      default: ""
    },

    confidence: {
      type: String,
      default: ""
    },

    summary: {
      type: String,
      default: ""
    },

    items: [
      {
        type: Schema.Types.ObjectId,
        ref: "WardrobeItem"
      }
    ],

    reasonChips: [String],

    weatherContext: {
      type: String,
      default: ""
    },

    colorNote: {
      type: String,
      default: ""
    },

    repetitionNote: {
      type: String,
      default: ""
    },

    careNote: {
      type: String,
      default: ""
    },

    feedback: {
      liked: {
        type: Boolean,
        default: null
      },

      reason: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

export const Outfit =
  models.Outfit || model("Outfit", OutfitSchema);