import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StylePreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    styleIdentity: { type: [String], default: [] },
    formality: { type: String, enum: ["relaxed", "balanced", "polished", "formal"], default: "balanced" },
    colorPreferences: { type: [String], default: [] },
    avoidColors: { type: [String], default: [] },
    comfortPriority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    repeatSensitivity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    weatherEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

  // add favorite fields to the main schema
  StylePreferenceSchema.add({
    favoriteColors: { type: [String], default: [] },
    favoriteCategories: { type: [String], default: [] }
  });

export type StylePreferenceDocument = InferSchemaType<typeof StylePreferenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StylePreference =
  (mongoose.models.StylePreference as Model<StylePreferenceDocument>) ||
  mongoose.model<StylePreferenceDocument>("StylePreference", StylePreferenceSchema);
// Note: additional fields like favoriteColors / favoriteCategories can be
// added to the primary StylePreferenceSchema above if needed.
