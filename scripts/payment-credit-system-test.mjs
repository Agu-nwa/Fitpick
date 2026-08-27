import { existsSync, readFileSync } from "node:fs";

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const packs = read("lib/payments/packs.ts");
for (const [id, credits, amountMinor] of [
  ["essential", 80, 1199],
  ["popular", 160, 2399],
  ["pro", 320, 4799],
  ["creator", 640, 9599]
]) {
  expect(packs.includes(`id: "${id}"`), `Missing credit pack id: ${id}`);
  expect(packs.includes(`credits: ${credits}`), `Wrong or missing credit amount for ${id}`);
  expect(packs.includes(`amountMinor: ${amountMinor}`), `Wrong or missing price for ${id}`);
}

const stripeProvider = read("lib/payments/providers/stripe.ts");
expect(stripeProvider.includes('mode: "payment"'), "Stripe Checkout must use payment mode.");
expect(!stripeProvider.includes('mode: "subscription"'), "Stripe Checkout must not use subscription mode.");
expect(!stripeProvider.includes("payment_method_types: [\"card\"]"), "Stripe Checkout must not hardcode card-only payment methods.");
expect(stripeProvider.includes("price_data"), "Stripe Checkout must use trusted server-side price_data.");

for (const file of [
  "models/CreditPurchase.ts",
  "models/ProcessedPaymentEvent.ts",
  "lib/payments/fulfilment.ts",
  "lib/payments/refunds.ts",
  "lib/payments/reconciliation.ts",
  "lib/payments/providers/coinpayments.ts",
  "app/api/payments/stripe/checkout/route.ts",
  "app/api/payments/usdt/checkout/route.ts",
  "app/api/payments/usdt/networks/route.ts",
  "app/api/payments/purchases/route.ts",
  "app/api/payments/purchases/[purchaseId]/route.ts",
  "app/api/webhooks/stripe/route.ts",
  "app/api/webhooks/coinpayments/route.ts",
  "app/wallet/payment/success/page.tsx"
]) {
  expect(existsSync(file), `Missing payment file: ${file}`);
}

for (const removed of [
  "app/api/billing/checkout/route.ts",
  "app/api/billing/plus-status/route.ts",
  "app/api/billing/providers/route.ts",
  "app/api/billing/webhook/paystack/route.ts",
  "app/api/billing/webhook/stripe/route.ts",
  "lib/payments/paystack.ts",
  "models/PlusSubscription.ts"
]) {
  expect(!existsSync(removed), `Obsolete subscription/payment file still exists: ${removed}`);
}

const walletClient = read("components/wallet/WalletClient.tsx");
expect(walletClient.includes('title="Top Up"'), "Wallet must expose the Top Up section.");
expect(walletClient.includes("Continue with Card"), "Wallet must present secure card checkout on the web.");
expect(walletClient.includes("Soon you&apos;ll be able to purchase MyFitPick Credits using USDT."), "Wallet must keep disabled USDT clearly marked as unavailable.");
expect(walletClient.includes("nativeMode"), "Wallet must branch to native App Store purchasing.");

const iosStripeRoute = read("app/api/payments/stripe/checkout/route.ts");
const iosCryptoRoute = read("app/api/payments/usdt/checkout/route.ts");
expect(iosStripeRoute.includes("isIosAppStoreRequest(request)"), "Stripe checkout must reject iOS App Store requests server-side.");
expect(iosCryptoRoute.includes("isIosAppStoreRequest(request)"), "Crypto checkout must reject iOS App Store requests server-side.");

const fulfilment = read("lib/payments/fulfilment.ts");
expect(fulfilment.includes("credit-purchase:"), "Fulfilment must use stable credit-purchase ledger references.");
expect(fulfilment.includes("creditedPurchaseReferences"), "Fulfilment must use user-level idempotency markers.");

if (failures.length) {
  console.error("Payment credit system checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Payment credit system checks passed.");
