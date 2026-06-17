import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const defaultFeatureLimits = {
  dailyPicks: 3,
  wardrobeItems: 50,
  savedLooks: 25
};

const PlusSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    provider: { type: String, enum: ["none", "stripe", "app_store", "play_store"], default: "none" },
    status: { type: String, enum: ["inactive", "active", "trialing", "past_due", "canceled"], default: "inactive" },
    plan: { type: String, enum: ["free", "plus"], default: "free" },
    currentPeriodEnd: { type: Date },
    featureLimits: {
      dailyPicks: { type: Number, default: defaultFeatureLimits.dailyPicks },
      wardrobeItems: { type: Number, default: defaultFeatureLimits.wardrobeItems },
      savedLooks: { type: Number, default: defaultFeatureLimits.savedLooks }
    }
  },
  { timestamps: true }
);

export type PlusSubscriptionDocument = InferSchemaType<typeof PlusSubscriptionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PlusSubscription =
  (mongoose.models.PlusSubscription as Model<PlusSubscriptionDocument>) ||
  mongoose.model<PlusSubscriptionDocument>("PlusSubscription", PlusSubscriptionSchema);
