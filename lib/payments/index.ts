import { serializeCreditPacks } from "@/lib/payments/packs";
import { appStoreProviderReadiness } from "@/lib/payments/providers/app-store";
import { stripeProviderReadiness } from "@/lib/payments/providers/stripe";

export function providerReadiness() {
  return {
    stripe: stripeProviderReadiness(),
    appStore: appStoreProviderReadiness()
  };
}

export function paymentsReady() {
  const readiness = providerReadiness();
  return readiness.stripe.configured || readiness.appStore.configured;
}

export function paymentOverview() {
  return {
    paymentsReady: paymentsReady(),
    providers: providerReadiness(),
    packs: serializeCreditPacks()
  };
}
