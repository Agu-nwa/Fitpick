import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AuditEventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: "" },
    entityId: { type: String, default: "" },
    ip: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type AuditEventDocument = InferSchemaType<typeof AuditEventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditEvent =
  (mongoose.models.AuditEvent as Model<AuditEventDocument>) ||
  mongoose.model<AuditEventDocument>("AuditEvent", AuditEventSchema);
