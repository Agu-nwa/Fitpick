import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const appNotificationTypes = [
  "virtual_tryon_ready",
  "virtual_tryon_failed",
  "wardrobe_review_ready"
] as const;

const AppNotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: appNotificationTypes, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, default: "", trim: true, maxlength: 240 },
    actionLabel: { type: String, default: "", trim: true, maxlength: 80 },
    actionUrl: { type: String, default: "", trim: true, maxlength: 240 },
    entityType: { type: String, default: "", trim: true, maxlength: 80, index: true },
    entityId: { type: String, default: "", trim: true, maxlength: 120, index: true },
    dedupeKey: { type: String, required: true, trim: true, maxlength: 180 },
    readAt: { type: Date, default: null, index: true },
    seenAt: { type: Date, default: null },
    emailStatus: {
      type: String,
      enum: ["not_requested", "skipped", "sent", "failed"],
      default: "not_requested",
      index: true
    },
    emailAttemptedAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

AppNotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
AppNotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
AppNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type AppNotificationDocument = InferSchemaType<typeof AppNotificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AppNotification =
  (mongoose.models.AppNotification as Model<AppNotificationDocument>) ||
  mongoose.model<AppNotificationDocument>("AppNotification", AppNotificationSchema);
