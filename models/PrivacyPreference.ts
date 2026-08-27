import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PrivacyPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    photoStorageConsent: { type: Boolean, default: false },
    photoStorageConsentAt: { type: Date, default: null },
    photoStorageConsentWithdrawnAt: { type: Date, default: null },
    photoStorageConsentVersion: { type: String, default: "" },
    aiProcessingConsent: { type: Boolean, default: false },
    aiProcessingConsentAt: { type: Date, default: null },
    aiProcessingConsentWithdrawnAt: { type: Date, default: null },
    aiProcessingConsentVersion: { type: String, default: "" },
    aiConsentRecords: {
      type: [{
        provider: { type: String, enum: ["openai", "fashn"], required: true },
        purpose: { type: String, enum: ["wardrobe_analysis", "styling", "preview_generation", "virtual_tryon", "voice_transcription"], required: true },
        policyVersion: { type: String, required: true },
        granted: { type: Boolean, required: true },
        recordedAt: { type: Date, required: true }
      }],
      default: [],
      select: false
    },
    personalizedRecommendations: { type: Boolean, default: true },
    outfitHistoryEnabled: { type: Boolean, default: true },
    marketingNotifications: { type: Boolean, default: false },
    accountDeletionRequestedAt: { type: Date }
  },
  { timestamps: true }
);

export type PrivacyPreferenceDocument = InferSchemaType<typeof PrivacyPreferenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PrivacyPreference =
  (mongoose.models.PrivacyPreference as Model<PrivacyPreferenceDocument>) ||
  mongoose.model<PrivacyPreferenceDocument>("PrivacyPreference", PrivacyPreferenceSchema);
