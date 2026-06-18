import type { BillingCurrency, CheckoutProviderInput, PaymentProvider } from "@/types/payment";

export function resolveCheckoutProvider(input: { provider?: CheckoutProviderInput; currency?: BillingCurrency }): PaymentProvider {
  if (input.provider === "stripe" || input.provider === "paystack" || input.provider === "placeholder") return input.provider;
  if (input.currency === "NGN") return "paystack";
  return "stripe";
}

export function paymentProviderSetting() {
  const configured = process.env.PAYMENT_PROVIDER;
  if (configured === "stripe" || configured === "paystack" || configured === "auto" || configured === "placeholder") return configured;
  return "placeholder";
}
