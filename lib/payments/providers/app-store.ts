import { Types } from "mongoose";
import { grantPurchasedCredits } from "@/lib/payments/fulfilment";
import { getCreditPackByAppStoreProductId } from "@/lib/payments/packs";
import { PaymentConfigurationError, PaymentValidationError } from "@/lib/payments/errors";
import { CreditPurchase } from "@/models/CreditPurchase";
import { User } from "@/models/User";

type RevenueCatEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  transaction_id?: string;
  original_transaction_id?: string;
  store?: string;
  environment?: string;
  price_in_purchased_currency?: number;
  currency?: string;
};

type RevenueCatWebhookPayload = {
  event?: RevenueCatEvent;
};

const ignoredRevenueCatEventTypes = new Set([
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_PAUSED",
  "TRANSFER",
  "UNCANCELLATION"
]);

export function appStoreProviderReadiness() {
  const missing = [
    !process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY ? "NEXT_PUBLIC_REVENUECAT_IOS_API_KEY" : "",
    !process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN ? "REVENUECAT_WEBHOOK_AUTH_TOKEN" : ""
  ].filter(Boolean);

  return {
    configured: missing.length === 0,
    currencies: ["USD"],
    paymentMethods: ["apple_iap"],
    message: missing.length ? `Missing ${missing.join(", ")}` : "Apple In-App Purchase is configured."
  };
}

export function verifyRevenueCatWebhook(authorizationHeader: string | null) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;
  if (!expected) throw new PaymentConfigurationError(["REVENUECAT_WEBHOOK_AUTH_TOKEN"]);
  const value = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  return Boolean(value && value === expected);
}

function safeRevenueCatReference(event: RevenueCatEvent) {
  return String(event.transaction_id || event.original_transaction_id || event.id || "").trim();
}

function minorAmountFromRevenueCat(event: RevenueCatEvent, fallbackMinor: number) {
  const price = Number(event.price_in_purchased_currency);
  if (!Number.isFinite(price) || price <= 0) return fallbackMinor;
  return Math.round(price * 100);
}

export async function fulfilRevenueCatCreditPurchase(payload: RevenueCatWebhookPayload) {
  const event = payload.event;
  if (!event) throw new PaymentValidationError("missing_revenuecat_event");

  const eventType = String(event.type || "");
  if (ignoredRevenueCatEventTypes.has(eventType)) {
    return { ignored: true, reason: "event_type_not_credit_purchase", eventType };
  }

  const productId = String(event.product_id || "").trim();
  const pack = getCreditPackByAppStoreProductId(productId);
  if (!pack) return { ignored: true, reason: "unknown_product_id" };

  const appUserId = String(event.app_user_id || "").trim();
  if (!Types.ObjectId.isValid(appUserId)) throw new PaymentValidationError("invalid_app_user_id");

  const user = await User.findById(appUserId).select("_id");
  if (!user) throw new PaymentValidationError("user_not_found");

  const providerReference = safeRevenueCatReference(event);
  if (!providerReference) throw new PaymentValidationError("missing_transaction_reference");

  const amountMinor = minorAmountFromRevenueCat(event, pack.amountMinor);
  const currency = String(event.currency || pack.currency || "USD").toUpperCase();

  const purchase = await CreditPurchase.findOneAndUpdate(
    {
      provider: "app_store",
      providerReference
    },
    {
      $setOnInsert: {
        userId: user._id,
        packId: pack.id,
        packName: pack.name,
        credits: pack.credits,
        amountMinor,
        currency: currency === "USD" ? "USD" : pack.currency,
        provider: "app_store",
        paymentMethod: "apple_iap",
        providerReference,
        paidAt: new Date()
      },
      $set: {
        status: "paid",
        appStore: {
          productId,
          transactionId: event.transaction_id ? String(event.transaction_id) : undefined,
          originalTransactionId: event.original_transaction_id ? String(event.original_transaction_id) : undefined,
          revenueCatEventId: event.id ? String(event.id) : undefined,
          revenueCatAppUserId: appUserId,
          store: String(event.store || "APP_STORE"),
          environment: String(event.environment || ""),
          amountReceived: amountMinor,
          currencyReceived: currency
        }
      }
    },
    { upsert: true, new: true }
  );

  const credited = await grantPurchasedCredits({
    purchaseId: purchase._id,
    provider: "app_store",
    providerReference
  });

  return {
    ignored: false,
    purchase: credited.purchase,
    credited: credited.credited,
    wallet: credited.wallet
  };
}
