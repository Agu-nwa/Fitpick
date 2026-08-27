import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const accountDeletionStates = [
  "requested",
  "validated",
  "access_disabled",
  "local_deletion_in_progress",
  "object_storage_deletion_in_progress",
  "provider_cleanup_in_progress",
  "provider_cleanup_pending",
  "completed",
  "completed_with_retained_records",
  "failed",
  "cancelled"
] as const;

const ProviderActionSchema = new Schema({
  provider: { type: String, required: true, maxlength: 60 },
  action: { type: String, required: true, maxlength: 180 },
  status: { type: String, enum: ["not_applicable", "automatic", "manual_pending", "completed", "failed"], required: true },
  identifier: { type: String, default: "", maxlength: 180 },
  requestedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  evidenceReference: { type: String, default: "", maxlength: 240 },
  error: { type: String, default: "", maxlength: 240 }
}, { _id: false });

const AccountDeletionRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  deletionReference: { type: String, required: true, unique: true, index: true },
  subjectEmail: { type: String, default: "", select: false },
  subjectEmailHash: { type: String, required: true, index: true },
  status: { type: String, enum: accountDeletionStates, default: "requested", index: true },
  reason: { type: String, default: "", maxlength: 240 },
  jobId: { type: Schema.Types.ObjectId, ref: "BackgroundJob", default: null },
  requestedAt: { type: Date, default: Date.now },
  validatedAt: { type: Date, default: null },
  accessDisabledAt: { type: Date, default: null },
  localDeletionCompletedAt: { type: Date, default: null },
  providerCleanupUpdatedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  lastError: { type: String, default: "", maxlength: 240 },
  objectKeys: { type: [String], default: [], select: false },
  deletedObjectCount: { type: Number, default: 0 },
  retainedRecordClasses: { type: [String], default: [] },
  providerActions: { type: [ProviderActionSchema], default: [] },
  tombstoneVersion: { type: String, default: "v1" }
}, { timestamps: true });

export type AccountDeletionRequestDocument = InferSchemaType<typeof AccountDeletionRequestSchema> & { _id: mongoose.Types.ObjectId };
export const AccountDeletionRequest =
  (mongoose.models.AccountDeletionRequest as Model<AccountDeletionRequestDocument>) ||
  mongoose.model<AccountDeletionRequestDocument>("AccountDeletionRequest", AccountDeletionRequestSchema);
