import type { BillingCurrency, BillingPlan, CheckoutProviderInput, CheckoutResult, PaymentProvider, ProviderReadiness } from "@/types/payment";

export type CheckoutInput = {
  userId: string;
  email: string;
  provider: CheckoutProviderInput;
  plan: BillingPlan;
  currency: BillingCurrency;
  successUrl?: string;
  cancelUrl?: string;
};

export type PaymentProviderAdapter = {
  provider: PaymentProvider;
  readiness: () => ProviderReadiness;
  createCheckout: (input: CheckoutInput) => Promise<CheckoutResult>;
};

export function amountForPlan(plan: BillingPlan, currency: BillingCurrency) {
  if (currency === "NGN") return plan === "plus_yearly" ? 48000 : 5000;
  return plan === "plus_yearly" ? 9600 : 999;
}
