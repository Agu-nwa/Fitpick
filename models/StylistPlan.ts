import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StylistPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["weekly", "capsule", "packing"], required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    status: { type: String, enum: ["ready", "incomplete"], default: "ready", index: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    context: { type: Schema.Types.Mixed, default: {} },
    looks: { type: Schema.Types.Mixed, default: [] },
    itemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    packingList: { type: Schema.Types.Mixed, default: [] },
    underusedItemIds: { type: [{ type: Schema.Types.ObjectId, ref: "WardrobeItem" }], default: [] },
    unavailableItems: { type: Schema.Types.Mixed, default: [] },
    gapInsights: { type: Schema.Types.Mixed, default: [] },
    warnings: { type: [String], default: [] }
  },
  { timestamps: true }
);

StylistPlanSchema.index({ userId: 1, createdAt: -1 });
StylistPlanSchema.index({ userId: 1, type: 1, createdAt: -1 });

export type StylistPlanDocument = InferSchemaType<typeof StylistPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const StylistPlan =
  (mongoose.models.StylistPlan as Model<StylistPlanDocument>) ||
  mongoose.model<StylistPlanDocument>("StylistPlan", StylistPlanSchema);
