import { serializeCreditPacks } from "@/lib/payments/packs";
import { cryptoPaymentsComingSoon } from "@/lib/payments/crypto-availability";
import { coinpaymentsProviderReadiness, parseUsdtNetworks } from "@/lib/payments/providers/coinpayments";
import { stripeProviderReadiness } from "@/lib/payments/providers/stripe";

export function providerReadiness() {
  const coinpayments = coinpaymentsProviderReadiness();
  return {
    stripe: stripeProviderReadiness(),
    coinpayments: cryptoPaymentsComingSoon()
      ? {
          ...coinpayments,
          configured: false,
          message: "Secure crypto payments are on the way."
        }
      : coinpayments
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
