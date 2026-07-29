import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ExternalSupportCustomerSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "SupportTenant", required: true, index: true },
    externalId: { type: String, required: true, trim: true, maxlength: 160 },
    name: { type: String, default: "", trim: true, maxlength: 160 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 254 },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

ExternalSupportCustomerSchema.index({ tenantId: 1, externalId: 1 }, { unique: true });

export type ExternalSupportCustomerDocument = InferSchemaType<typeof ExternalSupportCustomerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ExternalSupportCustomer =
  (mongoose.models.ExternalSupportCustomer as Model<ExternalSupportCustomerDocument>) ||
  mongoose.model<ExternalSupportCustomerDocument>("ExternalSupportCustomer", ExternalSupportCustomerSchema);
