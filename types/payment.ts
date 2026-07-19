export type PaymentProvider = "stripe" | "coinpayments";
export type PaymentMethod = "fiat" | "usdt";
export type CreditPurchaseStatus =
  | "created"
  | "pending"
  | "confirming"
  | "paid"
  | "credited"
  | "cancelled"
  | "expired"
  | "failed"
  | "underpaid"
  | "overpaid"
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

export type UsdtNetworkSummary = {
  id: string;
  displayName: string;
  asset: "USDT";
  network: string;
  availability: "available" | "unavailable";
  estimatedFee?: string;
};

export type ProviderReadiness = {
  configured: boolean;
  currencies: Array<"USD" | "USDT">;
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
  usdtNetwork?: string | null;
  expectedUsdtAmount?: string | null;
  receivedUsdtAmount?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
};
