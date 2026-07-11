import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const otpPurposes = ["signup", "signin"] as const;

const EmailOtpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, enum: otpPurposes, required: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null, index: true },
    requestedIp: { type: String, default: "" },
    userAgent: { type: String, default: "" }
  },
  { timestamps: true }
);

EmailOtpSchema.index({ email: 1, purpose: 1, consumedAt: 1, createdAt: -1 });
EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export type EmailOtpDocument = InferSchemaType<typeof EmailOtpSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmailOtp =
  (mongoose.models.EmailOtp as Model<EmailOtpDocument>) ||
  mongoose.model<EmailOtpDocument>("EmailOtp", EmailOtpSchema);
