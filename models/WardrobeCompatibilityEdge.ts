import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const compatibilityRelationshipTypes = [
  "colour_harmony",
  "occasion_match",
  "material_match",
  "silhouette_match",
  "accessory_match",
  "layer_match",
  "season_match",
  "weather_match",
  "historical_success"
] as const;

const WardrobeCompatibilityEdgeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceItemId: { type: Schema.Types.ObjectId, ref: "WardrobeItem", required: true, index: true },
    targetItemId: { type: Schema.Types.ObjectId, ref: "WardrobeItem", required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    relationshipTypes: {
      type: [String],
      enum: compatibilityRelationshipTypes,
      default: []
    },
    reasons: { type: [String], default: [] },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    source: {
      type: String,
      enum: ["fashion_rules", "ai", "user_history", "recommendation_engine", "system"],
      default: "fashion_rules",
      index: true
    },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

WardrobeCompatibilityEdgeSchema.index(
  { userId: 1, sourceItemId: 1, targetItemId: 1 },
  { unique: true }
);
WardrobeCompatibilityEdgeSchema.index({ userId: 1, score: -1 });
WardrobeCompatibilityEdgeSchema.index({ userId: 1, relationshipTypes: 1 });

export type WardrobeCompatibilityEdgeDocument =
  InferSchemaType<typeof WardrobeCompatibilityEdgeSchema> & {
    _id: mongoose.Types.ObjectId;
  };

export const WardrobeCompatibilityEdge =
  (mongoose.models.WardrobeCompatibilityEdge as Model<WardrobeCompatibilityEdgeDocument>) ||
  mongoose.model<WardrobeCompatibilityEdgeDocument>(
    "WardrobeCompatibilityEdge",
    WardrobeCompatibilityEdgeSchema
  );
