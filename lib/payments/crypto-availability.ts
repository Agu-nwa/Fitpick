export const CRYPTO_COMING_SOON_MESSAGE = "Crypto payments are coming soon.";

export function cryptoPaymentsEnabled() {
  return process.env.COINPAYMENTS_CHECKOUT_ENABLED === "true";
}

export function cryptoPaymentsComingSoon() {
  return !cryptoPaymentsEnabled();
}
