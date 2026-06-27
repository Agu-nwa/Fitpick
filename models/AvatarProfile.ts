import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AvatarProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    genderPresentation: { type: String, enum: ["masculine", "feminine", "neutral"], default: "neutral" },
    bodyPreset: { type: String, enum: ["slim", "average", "athletic", "curvy", "plus"], default: "average" },
    heightPreset: { type: String, enum: ["short", "average", "tall", null], default: null },
    skinTonePreset: { type: String, default: null, maxlength: 60 },
    hairStylePreset: { type: String, default: null, maxlength: 60 },
    posePreset: { type: String, enum: ["standing", "walking", "editorial", "runway", "casual"], default: "standing" },
    visualizationStyle: { type: String, enum: ["minimal", "luxury", "streetwear", "editorial"], default: "luxury" },
    avatarProvider: { type: String, enum: ["ready_player_me", "fitpick_preset", "custom_glb"], default: "fitpick_preset" },
    avatarUrl: { type: String, default: null, maxlength: 2048 },
    glbStorageKey: { type: String, default: null, maxlength: 512 },
    consentAccepted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type AvatarProfileDocument = InferSchemaType<typeof AvatarProfileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AvatarProfile =
  (mongoose.models.AvatarProfile as Model<AvatarProfileDocument>) ||
  mongoose.model<AvatarProfileDocument>("AvatarProfile", AvatarProfileSchema);
