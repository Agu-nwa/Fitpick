import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StylePreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    styleIdentity: { type: [String], default: [] },
    formality: { type: String, enum: ["relaxed", "balanced", "polished", "formal"], default: "balanced" },
    colorPreferences: { type: [String], default: [] },
    avoidColors: { type: [String], default: [] },
    comfortPriority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    nativeWearFrequency: { type: String, enum: ["rarely", "sometimes", "often", "weekly"], default: "sometimes" },
    repeatSensitivity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    weatherEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type StylePreferenceDocument = InferSchemaType<typeof StylePreferenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StylePreference =
  (mongoose.models.StylePreference as Model<StylePreferenceDocument>) ||
  mongoose.model<StylePreferenceDocument>("StylePreference", StylePreferenceSchema);
