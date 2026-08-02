import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StudioModelConfigurationSchema = new Schema({
  version: { type: String, enum: ["studio-model-v1"], required: true },
  representation: { type: String, enum: ["studio_model", "personal_digital_twin"], default: "studio_model" },
  gender: { type: String, enum: ["female", "male"], required: true },
  bodyType: { type: String, enum: ["petite", "standard", "athletic", "broad", "curvy", "plus_size", "maternity"], required: true },
  skinTone: { type: String, enum: ["tone_01", "tone_02", "tone_03", "tone_04", "tone_05", "tone_06", "tone_07", "tone_08", "tone_09", "tone_10"], required: true },
  undertone: { type: String, enum: ["cool", "neutral", "warm"], default: null },
  hairTexture: { type: String, enum: ["straight", "wavy", "curly", "coily", "kinky_coily", "bald"], required: true },
  hairLength: { type: String, enum: ["shaved", "short", "medium", "long"], required: true },
  hairColor: { type: String, enum: ["black", "dark_brown", "medium_brown", "light_brown", "blonde", "auburn", "red", "grey", "white"], required: true },
  hairStyle: { type: String, enum: ["bald", "buzz_cut", "close_crop", "short_natural", "afro", "waves", "locs", "braids", "cornrows", "twists", "bob", "pixie", "straight", "wavy", "curly", "ponytail", "bun"], required: true },
  heightBand: { type: String, enum: ["short", "average", "tall"], default: null }
}, { _id: false });

const AvatarProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    genderPresentation: { type: String, enum: ["masculine", "feminine", "neutral"], default: "neutral" },
    bodyPreset: { type: String, enum: ["slim", "average", "athletic", "curvy", "plus"], default: "average" },
    heightPreset: { type: String, enum: ["short", "average", "tall", null], default: null },
    skinTonePreset: { type: String, default: null, maxlength: 60 },
    hairStylePreset: { type: String, default: null, maxlength: 60 },
    posePreset: { type: String, enum: ["standing", "walking", "editorial", "runway", "casual", "side", "back"], default: "standing" },
    visualizationStyle: { type: String, enum: ["minimal", "luxury", "streetwear", "editorial"], default: "luxury" },
    avatarProvider: { type: String, enum: ["ready_player_me", "fitpick_preset", "custom_glb"], default: "fitpick_preset" },
    avatarUrl: { type: String, default: null, maxlength: 2048 },
    glbStorageKey: { type: String, default: null, maxlength: 512 },
    tryOnModelSource: { type: String, enum: ["none", "uploaded", "generated", "studio"], default: "none" },
    uploadedModelImageUrl: { type: String, default: null, maxlength: 2048 },
    uploadedModelImageStorageKey: { type: String, default: null, maxlength: 512 },
    generatedModelImageUrl: { type: String, default: null, maxlength: 2048 },
    generatedModelImageStorageKey: { type: String, default: null, maxlength: 512 },
    generatedModelPromptVersion: { type: String, default: "", maxlength: 80 },
    generatedModelAt: { type: Date, default: null },
    studioModelGender: { type: String, enum: ["male", "female", null], default: null },
    studioModelType: { type: String, enum: ["standard", "petite", "athletic", "broad", "curvy", "plus-size", "maternity", null], default: null },
    studioModelImageUrl: { type: String, default: null, maxlength: 2048 },
    studioModelConfiguration: { type: StudioModelConfigurationSchema, default: null },
    studioModelAppearanceKey: { type: String, default: null, maxlength: 40, index: true },
    studioModelAssetStatus: { type: String, enum: ["pending", "ready", "fallback", null], default: null },
    studioModelAssetId: { type: String, default: null, maxlength: 200 },
    studioModelFallbackReason: { type: String, default: null, maxlength: 160 },
    heightCm: { type: Number, default: null, min: 90, max: 240 },
    weightKg: { type: Number, default: null, min: 25, max: 260 },
    chestCm: { type: Number, default: null, min: 45, max: 180 },
    bustCm: { type: Number, default: null, min: 45, max: 180 },
    waistCm: { type: Number, default: null, min: 40, max: 180 },
    hipsCm: { type: Number, default: null, min: 45, max: 200 },
    shoulderWidthCm: { type: Number, default: null, min: 25, max: 80 },
    inseamCm: { type: Number, default: null, min: 35, max: 130 },
    armLengthCm: { type: Number, default: null, min: 30, max: 110 },
    neckCm: { type: Number, default: null, min: 20, max: 70 },
    thighCm: { type: Number, default: null, min: 25, max: 110 },
    shoeSize: { type: String, default: "", maxlength: 40 },
    bodyMeasurementSource: { type: String, enum: ["manual", "estimated", "body_scan", "unknown"], default: "unknown" },
    bodyMeasurementConfidence: { type: Number, default: 0, min: 0, max: 1 },
    bodyFitPreference: { type: String, enum: ["true_to_size", "slim", "regular", "relaxed", "oversized"], default: "regular" },
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
