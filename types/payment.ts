export type PaymentProvider = "stripe" | "paystack" | "flutterwave" | "placeholder";
export type CheckoutProviderInput = "stripe" | "paystack" | "auto" | "placeholder";
export type BillingPlan = "plus_monthly" | "plus_yearly";
export type BillingCurrency = "USD" | "NGN";

export type ProviderReadiness = {
  configured: boolean;
  currencies: BillingCurrency[];
  supportsRecurring: boolean;
};

export type CheckoutResult = {
  provider: PaymentProvider;
  ready: boolean;
  plan: BillingPlan;
  currency: BillingCurrency;
  checkoutUrl?: string | null;
  authorizationUrl?: string | null;
  accessCode?: string | null;
  reference?: string | null;
  message: string;
  nextAction: string;
};
