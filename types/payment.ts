export type PaymentProvider = "stripe" | "app_store";
export type PaymentMethod = "fiat" | "apple_iap";
export type CreditPurchaseStatus =
  | "created"
  | "pending"
  | "paid"
  | "credited"
  | "cancelled"
  | "expired"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "chargeback"
  | "review_required";

export type CreditPackSummary = {
  id: string;
  label: string;
  credits: number;
  amountMinor: number;
  currency: "USD";
  amountLabel: string;
  status: "available";
};

export type ProviderReadiness = {
  configured: boolean;
  currencies: Array<"USD">;
  paymentMethods: PaymentMethod[];
  message?: string;
};

export type CreditPurchaseSummary = {
  id: string;
  packId: string;
  packName: string;
  credits: number;
  amountMinor: number;
  amountLabel: string;
  currency: "USD";
  provider: PaymentProvider;
  paymentMethod: PaymentMethod;
  status: CreditPurchaseStatus;
  createdAt: string | null;
  paidAt: string | null;
  creditedAt: string | null;
  refundedAt: string | null;
  checkoutUrl?: string | null;
  appStoreProductId?: string | null;
  appStoreTransactionId?: string | null;
};
