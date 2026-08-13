import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StyleProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    favoriteColors: { type: [String], default: [] },
    dislikedColors: { type: [String], default: [] },
    favoriteBrands: { type: [String], default: [] },
    dislikedBrands: { type: [String], default: [] },
    preferredFits: { type: [String], default: [] },
    dislikedFits: { type: [String], default: [] },
    preferredFormality: { type: Number, default: null, min: 0, max: 10 },
    preferredOccasions: { type: [String], default: [] },
    eventStylePreferences: { type: [String], default: [] },
    preferredCategories: { type: [String], default: [] },
    avoidedCategories: { type: [String], default: [] },
    fashionRiskLevel: { type: String, enum: ["conservative", "balanced", "expressive"], default: "balanced" },
    comfortPriority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    luxuryPreference: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    notes: { type: [String], default: [] },
    inferredFrom: { type: [String], default: [] },
    lifestyle: {
      workEnvironment: { type: String, default: "", maxlength: 120 },
      weeklyActivities: { type: [String], default: [] },
      commonDressCodes: { type: [String], default: [] },
      walkingPriority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
      transportModes: { type: [String], default: [] }
    },
    stylingConstraints: {
      modestyPreferences: { type: [String], default: [] },
      coveragePreferences: { type: [String], default: [] },
      fabricSensitivities: { type: [String], default: [] },
      heelHeightPreference: { type: String, enum: ["none", "low", "medium", "high", "any"], default: "any" },
      carryNeeds: { type: [String], default: [] },
      garmentAvoidances: { type: [String], default: [] }
    },
    stylingGoals: { type: [String], default: [] },
    contextualPreferences: {
      type: [{
        occasion: { type: String, required: true, maxlength: 80 },
        preferredFits: { type: [String], default: [] },
        preferredColors: { type: [String], default: [] },
        preferredFormality: { type: String, default: "", maxlength: 40 },
        accessoryLevel: { type: String, enum: ["minimal", "balanced", "expressive", ""], default: "" },
        comfortPriority: { type: String, enum: ["low", "medium", "high", ""], default: "" }
      }],
      default: []
    }
  },
  { timestamps: true }
);

export type StyleProfileDocument = InferSchemaType<typeof StyleProfileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StyleProfile =
  (mongoose.models.StyleProfile as Model<StyleProfileDocument>) ||
  mongoose.model<StyleProfileDocument>("StyleProfile", StyleProfileSchema);
