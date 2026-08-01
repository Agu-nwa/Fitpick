import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const creditPurchaseStatuses = [
  "created",
  "pending",
  "paid",
  "credited",
  "cancelled",
  "expired",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
  "chargeback",
  "review_required"
] as const;

const StripePurchaseSchema = new Schema(
  {
    checkoutSessionId: { type: String, trim: true },
    paymentIntentId: { type: String, trim: true },
    chargeId: { type: String, trim: true },
    customerId: { type: String, trim: true },
    paymentMethodType: { type: String, trim: true },
    amountReceived: { type: Number, min: 0 },
    currencyReceived: { type: String, trim: true, uppercase: true }
  },
  { _id: false }
);

const AppStorePurchaseSchema = new Schema(
  {
    productId: { type: String, trim: true },
    transactionId: { type: String, trim: true },
    originalTransactionId: { type: String, trim: true },
    revenueCatEventId: { type: String, trim: true },
    revenueCatAppUserId: { type: String, trim: true },
    store: { type: String, trim: true },
    environment: { type: String, trim: true },
    amountReceived: { type: Number, min: 0 },
    currencyReceived: { type: String, trim: true, uppercase: true }
  },
  { _id: false }
);

const RefundSchema = new Schema(
  {
    providerRefundId: { type: String, trim: true },
    amountMinor: { type: Number, min: 0 },
    reason: { type: String, trim: true, maxlength: 240 },
    status: { type: String, trim: true }
  },
  { _id: false }
);

const CreditPurchaseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    packId: { type: String, required: true, trim: true, maxlength: 40 },
    packName: { type: String, required: true, trim: true, maxlength: 80 },
    credits: { type: Number, required: true, min: 1 },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["USD"], default: "USD" },
    provider: { type: String, enum: ["stripe", "app_store"], required: true, index: true },
    paymentMethod: { type: String, enum: ["fiat", "apple_iap"], required: true },
    status: { type: String, enum: creditPurchaseStatuses, default: "created", index: true },
    providerReference: { type: String, trim: true },
    stripe: { type: StripePurchaseSchema, default: undefined },
    appStore: { type: AppStorePurchaseSchema, default: undefined },
    paidAt: { type: Date },
    creditedAt: { type: Date },
    cancelledAt: { type: Date },
    expiredAt: { type: Date },
    refundedAt: { type: Date },
    expiresAt: { type: Date },
    refund: { type: RefundSchema, default: undefined },
    reviewReason: { type: String, trim: true, maxlength: 240 }
  },
  { timestamps: true }
);

CreditPurchaseSchema.index({ userId: 1, createdAt: -1 });
CreditPurchaseSchema.index({ status: 1, createdAt: -1 });
CreditPurchaseSchema.index(
  { "stripe.checkoutSessionId": 1 },
  { unique: true, partialFilterExpression: { "stripe.checkoutSessionId": { $type: "string" } } }
);
CreditPurchaseSchema.index(
  { "stripe.paymentIntentId": 1 },
  { unique: true, partialFilterExpression: { "stripe.paymentIntentId": { $type: "string" } } }
);
CreditPurchaseSchema.index(
  { "appStore.transactionId": 1 },
  { unique: true, partialFilterExpression: { "appStore.transactionId": { $type: "string" } } }
);
CreditPurchaseSchema.index(
  { "appStore.revenueCatEventId": 1 },
  { unique: true, partialFilterExpression: { "appStore.revenueCatEventId": { $type: "string" } } }
);
CreditPurchaseSchema.index(
  { providerReference: 1 },
  { unique: true, partialFilterExpression: { providerReference: { $type: "string" } } }
);

export type CreditPurchaseDocument = InferSchemaType<typeof CreditPurchaseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CreditPurchase =
  (mongoose.models.CreditPurchase as Model<CreditPurchaseDocument>) ||
  mongoose.model<CreditPurchaseDocument>("CreditPurchase", CreditPurchaseSchema);
