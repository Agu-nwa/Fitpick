import { paystackPaymentProvider, paystackReady } from "@/lib/payments/paystack";
import { resolveCheckoutProvider } from "@/lib/payments/provider";
import { stripePaymentProvider, stripeReady } from "@/lib/payments/stripe";
import type { CheckoutInput } from "@/lib/payments/types";
import type { BillingCurrency, CheckoutProviderInput, ProviderReadiness } from "@/types/payment";

export function providerReadiness(): Record<"stripe" | "paystack" | "flutterwave", ProviderReadiness> {
  return {
    stripe: stripePaymentProvider.readiness(),
    paystack: paystackPaymentProvider.readiness(),
    flutterwave: {
      configured: false,
      currencies: ["NGN"],
      supportsRecurring: false
    }
  };
}

export function billingReady() {
  return stripeReady() || paystackReady();
}

export function providerForCheckout(input: { provider?: CheckoutProviderInput; currency?: BillingCurrency }) {
  const provider = resolveCheckoutProvider(input);
  if (provider === "paystack") return paystackPaymentProvider;
  if (provider === "stripe") return stripePaymentProvider;
  return null;
}

export async function createProviderCheckout(input: CheckoutInput) {
  const provider = providerForCheckout({ provider: input.provider, currency: input.currency });
  if (!provider) {
    return {
      provider: "placeholder" as const,
      ready: false,
      plan: input.plan,
      currency: input.currency,
      message: "This payment option is not configured yet.",
      nextAction: "choose_provider"
    };
  }
  return provider.createCheckout(input);
}
