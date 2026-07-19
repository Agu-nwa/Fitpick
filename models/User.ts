import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { SafeUser } from "@/types/auth";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, default: "", select: false },
    avatarUrl: { type: String, default: "" },
    timezone: { type: String, default: "" },
    locale: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    credits: { type: Number, default: 20, min: 0 },
    totalCreditsPurchased: { type: Number, default: 0, min: 0 },
    totalCreditsRefunded: { type: Number, default: 0, min: 0 },
    totalCreditsSpent: { type: Number, default: 0, min: 0 },
    complimentaryCreditsUsed: { type: Number, default: 0, min: 0 },
    creditedPurchaseReferences: { type: [String], default: [], select: false },
    reversedCreditPurchaseReferences: { type: [String], default: [], select: false },
    activeSessionId: { type: String, default: "", select: false, index: true },
    activeSessionIssuedAt: { type: Date, default: null },
    modelSetupCompletedAt: { type: Date, default: null },
    weatherLocationName: { type: String, default: "", trim: true, maxlength: 120 },
    weatherLatitude: { type: Number, default: null, min: -90, max: 90 },
    weatherLongitude: { type: Number, default: null, min: -180, max: 180 },
    weatherLocationUpdatedAt: { type: Date, default: null },
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User =
  (mongoose.models.User as Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", UserSchema);

export function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || undefined,
    timezone: user.timezone || undefined,
    locale: user.locale || undefined,
    role: user.role,
    credits: typeof user.credits === "number" ? user.credits : 20,
    totalCreditsPurchased: user.totalCreditsPurchased || 0,
    totalCreditsRefunded: user.totalCreditsRefunded || 0,
    totalCreditsSpent: user.totalCreditsSpent || 0,
    complimentaryCreditsUsed: user.complimentaryCreditsUsed || 0,
    modelSetupCompletedAt: user.modelSetupCompletedAt?.toISOString(),
    weatherLocationName: user.weatherLocationName || undefined,
    weatherLatitude: typeof user.weatherLatitude === "number" ? user.weatherLatitude : undefined,
    weatherLongitude: typeof user.weatherLongitude === "number" ? user.weatherLongitude : undefined,
    weatherLocationUpdatedAt: user.weatherLocationUpdatedAt?.toISOString(),
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString()
  };
}
