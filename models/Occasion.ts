import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const OccasionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, index: true },
    group: { type: String, enum: ["everyday", "formal", "social", "cultural", "weather"], required: true },
    formality: { type: String, enum: ["relaxed", "balanced", "polished", "formal"], required: true },
    weatherRules: { type: [String], default: [] },
    culturalRules: { type: [String], default: [] },
    avoidRules: { type: [String], default: [] },
    isGlobal: { type: Boolean, default: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true }
  },
  { timestamps: true }
);

export type OccasionDocument = InferSchemaType<typeof OccasionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Occasion =
  (mongoose.models.Occasion as Model<OccasionDocument>) ||
  mongoose.model<OccasionDocument>("Occasion", OccasionSchema);
