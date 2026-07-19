import { serializeCreditPacks } from "@/lib/payments/packs";
import { coinpaymentsProviderReadiness, parseUsdtNetworks } from "@/lib/payments/providers/coinpayments";
import { stripeProviderReadiness } from "@/lib/payments/providers/stripe";

export function providerReadiness() {
  return {
    stripe: stripeProviderReadiness(),
    coinpayments: coinpaymentsProviderReadiness()
  };
}

export function paymentsReady() {
  const readiness = providerReadiness();
  return readiness.stripe.configured || readiness.coinpayments.configured;
}

export function paymentOverview() {
  return {
    paymentsReady: paymentsReady(),
    providers: providerReadiness(),
    packs: serializeCreditPacks(),
    usdtNetworks: parseUsdtNetworks().map((network) => ({
      id: network.id,
      displayName: network.displayName,
      asset: network.asset,
      network: network.network,
      estimatedFee: network.estimatedFee,
      availability: network.availability
    }))
  };
}
