import crypto from "node:crypto";
import { CreditPurchase } from "@/models/CreditPurchase";
import { grantPurchasedCredits } from "@/lib/payments/fulfilment";
import { PaymentConfigurationError, PaymentProviderError, PaymentValidationError } from "@/lib/payments/errors";
import { formatUsdMinor, type CreditPack } from "@/lib/payments/packs";

type UsdtNetworkConfig = {
  id: string;
  displayName: string;
  asset: "USDT";
  network: string;
  providerCurrencyId: string;
  estimatedFee?: string;
  availability: "available" | "unavailable";
};

const officialCoinPaymentsHosts = new Set([
  "a-api.coinpayments.net",
  "b-api.coinpayments.net",
  "c-api.coinpayments.net",
  "api.coinpayments.net"
]);

function sanitizeString(value: unknown, max = 220) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeJson(value: unknown) {
  return JSON.stringify(value, (_key, fieldValue) => {
    if (typeof fieldValue === "string" && fieldValue.length > 400) return fieldValue.slice(0, 400);
    return fieldValue;
  });
}

function timestampUtc() {
  return new Date().toISOString().split(".")[0];
}

function coinpaymentsBaseUrl() {
  const raw = process.env.COINPAYMENTS_API_BASE_URL || "";
  if (!raw) throw new PaymentConfigurationError(["COINPAYMENTS_API_BASE_URL"]);

  const url = new URL(raw);
  if (url.protocol !== "https:" || !officialCoinPaymentsHosts.has(url.hostname)) {
    throw new PaymentConfigurationError(["COINPAYMENTS_API_BASE_URL"], "CoinPayments API base URL is not an approved official host.");
  }
  return raw.replace(/\/$/, "");
}

function coinpaymentsCredentials() {
  const missing = [];
  if (!process.env.COINPAYMENTS_CLIENT_ID) missing.push("COINPAYMENTS_CLIENT_ID");
  if (!process.env.COINPAYMENTS_CLIENT_SECRET) missing.push("COINPAYMENTS_CLIENT_SECRET");
  if (!process.env.COINPAYMENTS_WEBHOOK_SECRET) missing.push("COINPAYMENTS_WEBHOOK_SECRET");
  if (!process.env.COINPAYMENTS_USD_CURRENCY_ID) missing.push("COINPAYMENTS_USD_CURRENCY_ID");
  if (!process.env.COINPAYMENTS_USDT_NETWORK_ALLOWLIST) missing.push("COINPAYMENTS_USDT_NETWORK_ALLOWLIST");
  if (missing.length) throw new PaymentConfigurationError(missing);

  return {
    clientId: process.env.COINPAYMENTS_CLIENT_ID!,
    clientSecret: process.env.COINPAYMENTS_CLIENT_SECRET!,
    webhookSecret: process.env.COINPAYMENTS_WEBHOOK_SECRET!,
    usdCurrencyId: process.env.COINPAYMENTS_USD_CURRENCY_ID!
  };
}

function signCoinPaymentsRequest(input: {
  method: string;
  url: string;
  clientId: string;
  clientSecret: string;
  timestamp: string;
  payload: string;
}) {
  return crypto
    .createHmac("sha256", input.clientSecret)
    .update(`\ufeff${input.method.toUpperCase()}${input.url}${input.clientId}${input.timestamp}${input.payload}`)
    .digest("base64");
}

function timingSafeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function parseUsdtNetworks(): UsdtNetworkConfig[] {
  const raw = process.env.COINPAYMENTS_USDT_NETWORK_ALLOWLIST || "";
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((network) => ({
          id: sanitizeString(network.id, 80),
          displayName: sanitizeString(network.displayName, 120),
          asset: "USDT" as const,
          network: sanitizeString(network.network, 120),
          providerCurrencyId: sanitizeString(network.providerCurrencyId, 160),
          estimatedFee: sanitizeString(network.estimatedFee, 80) || undefined,
          availability: network.availability === "unavailable" ? "unavailable" as const : "available" as const
        }))
        .filter((network) => network.id && network.displayName && network.network && network.providerCurrencyId);
    }
  } catch {
    // Fall back to the compact semicolon format below.
  }

  return raw
    .split(";")
    .map((entry) => {
      const [id, displayName, network, providerCurrencyId, estimatedFee] = entry.split("|").map((part) => part.trim());
      return {
        id,
        displayName,
        asset: "USDT" as const,
        network,
        providerCurrencyId,
        estimatedFee: estimatedFee || undefined,
        availability: "available" as const
      };
    })
    .filter((network) => network.id && network.displayName && network.network && network.providerCurrencyId);
}

export function getUsdtNetwork(networkId: string) {
  return parseUsdtNetworks().find((network) => network.id === networkId && network.availability === "available") || null;
}

export function coinpaymentsProviderReadiness() {
  const missing = [];
  if (!process.env.COINPAYMENTS_API_BASE_URL) missing.push("COINPAYMENTS_API_BASE_URL");
  if (!process.env.COINPAYMENTS_CLIENT_ID) missing.push("COINPAYMENTS_CLIENT_ID");
  if (!process.env.COINPAYMENTS_CLIENT_SECRET) missing.push("COINPAYMENTS_CLIENT_SECRET");
  if (!process.env.COINPAYMENTS_WEBHOOK_SECRET) missing.push("COINPAYMENTS_WEBHOOK_SECRET");
  if (!process.env.COINPAYMENTS_USD_CURRENCY_ID) missing.push("COINPAYMENTS_USD_CURRENCY_ID");
  if (!parseUsdtNetworks().length) missing.push("COINPAYMENTS_USDT_NETWORK_ALLOWLIST");
  return {
    configured: missing.length === 0,
    currencies: ["USDT" as const],
    paymentMethods: ["usdt" as const],
    message: missing.length ? `Missing ${missing.join(", ")}` : "CoinPayments USDT invoices are configured."
  };
}

async function signedCoinPaymentsFetch(path: string, options: { method?: string; body?: unknown } = {}) {
  const credentials = coinpaymentsCredentials();
  const baseUrl = coinpaymentsBaseUrl();
  const method = (options.method || "GET").toUpperCase();
  const url = `${baseUrl}${path}`;
  const payload = options.body === undefined ? "" : JSON.stringify(options.body);
  const timestamp = timestampUtc();
  const signature = signCoinPaymentsRequest({
    method,
    url,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    timestamp,
    payload
  });

  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "X-CoinPayments-Client": credentials.clientId,
      "X-CoinPayments-Timestamp": timestamp,
      "X-CoinPayments-Signature": signature
    },
    body: payload || undefined
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new PaymentProviderError(`coinpayments_${response.status}`);
  return data;
}

function firstInvoice(payload: any) {
  if (Array.isArray(payload?.invoices)) return payload.invoices[0];
  if (Array.isArray(payload?.items)) return payload.items[0];
  if (payload?.invoice) return payload.invoice;
  return payload;
}

function firstPayment(invoice: any, networkCode: string) {
  const payments = Array.isArray(invoice?.payments) ? invoice.payments : [];
  return payments.find((payment: any) => payment.paymentCurrencyId === networkCode) || payments[0] || null;
}

function decimalParts(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, fraction = ""] = cleaned.split(".");
  return {
    whole: BigInt(whole || "0"),
    fraction: (fraction + "000000000000").slice(0, 12)
  };
}

function compareDecimalStrings(left: string, right: string) {
  const a = decimalParts(left);
  const b = decimalParts(right);
  if (a.whole > b.whole) return 1;
  if (a.whole < b.whole) return -1;
  if (a.fraction > b.fraction) return 1;
  if (a.fraction < b.fraction) return -1;
  return 0;
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function createCoinPaymentsInvoice(input: {
  purchaseId: string;
  userId: string;
  email: string;
  pack: CreditPack;
  networkId: string;
}) {
  const credentials = coinpaymentsCredentials();
  const network = getUsdtNetwork(input.networkId);
  if (!network) throw new PaymentValidationError("unsupported_usdt_network");

  const baseUrl = appUrl();
  const amount = formatUsdMinor(input.pack.amountMinor);
  const body = {
    currency: credentials.usdCurrencyId,
    invoiceId: input.purchaseId,
    items: [
      {
        customId: input.pack.id,
        sku: `credits-${input.pack.id}`,
        name: `${input.pack.name} Credits`,
        description: `${input.pack.credits} MyFitPick Credits`,
        quantity: { value: 1, type: "quantity" },
        amount
      }
    ],
    amount: {
      breakdown: { subtotal: amount },
      total: amount
    },
    payment: {
      paymentCurrency: network.providerCurrencyId,
      refundEmail: input.email
    },
    customData: {
      purchaseId: input.purchaseId,
      userId: input.userId,
      packId: input.pack.id,
      networkId: network.id
    },
    webhooks: [
      {
        notificationsUrl: process.env.COINPAYMENTS_WEBHOOK_URL || `${baseUrl}/api/webhooks/coinpayments`,
        notifications: ["invoiceCreated", "invoicePending", "invoicePaid", "invoiceCompleted", "invoiceCancelled", "invoiceTimedOut"]
      }
    ],
    successUrl: `${baseUrl}/wallet/payment/success?purchaseId=${input.purchaseId}&provider=coinpayments`,
    cancelUrl: `${baseUrl}/wallet?payment=cancelled&purchaseId=${input.purchaseId}`,
    hideShoppingCart: true
  };

  const payload = await signedCoinPaymentsFetch("/merchant/invoices", { method: "POST", body });
  const invoice = firstInvoice(payload);
  const invoiceId = sanitizeString(invoice?.id || invoice?.invoiceId || input.purchaseId, 160);
  const payment = firstPayment(invoice, network.providerCurrencyId);
  const checkoutUrl = sanitizeString(invoice?.checkoutLink || invoice?.checkoutUrl || invoice?.link, 500);

  if (!invoiceId || !checkoutUrl) throw new PaymentProviderError("coinpayments_invoice_missing_checkout");

  await CreditPurchase.findByIdAndUpdate(input.purchaseId, {
    $set: {
      status: "pending",
      providerReference: invoiceId,
      expiresAt: invoice?.expires ? new Date(invoice.expires) : undefined,
      coinpayments: {
        invoiceId,
        invoiceNumber: sanitizeString(invoice?.invoiceId || input.purchaseId, 160),
        asset: "USDT",
        networkCode: network.providerCurrencyId,
        expectedAmount: sanitizeString(payment?.expectedAmount || payment?.nativeExpectedAmount || "", 80),
        receivedAmount: sanitizeString(payment?.actualAmount || "", 80),
        paymentAddress: sanitizeString(payment?.paymentAddress || "", 220),
        transactionHash: sanitizeString(payment?.receivedBlockchainTxId || "", 220),
        confirmations: Number.isFinite(Number(payment?.confirmations)) ? Number(payment.confirmations) : undefined,
        requiredConfirmations: Number.isFinite(Number(payment?.requiredConfirmations)) ? Number(payment.requiredConfirmations) : undefined,
        checkoutUrl,
        linkUrl: sanitizeString(invoice?.link || "", 500)
      }
    }
  });

  return {
    checkoutUrl,
    invoiceId,
    network,
    warning: "Send only USDT using the selected network. Funds sent through another network may not be recoverable."
  };
}

export function verifyCoinPaymentsWebhook(input: {
  method: string;
  url: string;
  rawBody: string;
  headers: Headers;
}) {
  const credentials = coinpaymentsCredentials();
  const clientId = input.headers.get("x-coinpayments-client") || "";
  const timestamp = input.headers.get("x-coinpayments-timestamp") || "";
  const signature = input.headers.get("x-coinpayments-signature") || "";

  if (!clientId || clientId !== credentials.clientId) return { ok: false as const, reason: "client_mismatch" };
  if (!timestamp || !signature) return { ok: false as const, reason: "missing_signature_headers" };

  const timestampMs = Date.parse(`${timestamp}Z`);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return { ok: false as const, reason: "stale_timestamp" };
  }

  const expected = signCoinPaymentsRequest({
    method: input.method,
    url: input.url,
    clientId,
    clientSecret: credentials.webhookSecret,
    timestamp,
    payload: input.rawBody
  });

  return timingSafeEqualText(expected, signature)
    ? { ok: true as const }
    : { ok: false as const, reason: "signature_mismatch" };
}

export function safeCoinPaymentsEventId(payload: any, rawBody: string) {
  return sanitizeString(payload?.id || payload?.eventId || payload?.notificationId, 180) ||
    crypto.createHash("sha256").update(rawBody).digest("hex");
}

export function coinPaymentsInvoiceId(payload: any) {
  return sanitizeString(
    payload?.invoice?.id ||
    payload?.invoice?.invoiceId ||
    payload?.data?.invoice?.id ||
    payload?.data?.id ||
    payload?.id,
    160
  );
}

export async function retrieveCoinPaymentsInvoice(invoiceId: string) {
  const encoded = encodeURIComponent(invoiceId);
  const payload = await signedCoinPaymentsFetch(`/merchant/invoices/${encoded}`, { method: "GET" });
  return firstInvoice(payload);
}

export async function processCoinPaymentsInvoiceEvent(payload: any) {
  const eventType = sanitizeString(payload?.type || payload?.event || payload?.eventType || "", 120);
  const eventTypeLower = eventType.toLowerCase();
  const invoiceId = coinPaymentsInvoiceId(payload);
  if (!invoiceId) throw new PaymentValidationError("missing_invoice_id");

  const purchase = await CreditPurchase.findOne({ provider: "coinpayments", "coinpayments.invoiceId": invoiceId });
  if (!purchase) throw new PaymentValidationError("purchase_not_found");

  if (eventTypeLower.includes("timedout")) {
    return CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "expired", expiredAt: new Date() }
    });
  }
  if (eventTypeLower.includes("cancelled")) {
    return CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "cancelled", cancelledAt: new Date() }
    });
  }
  if (eventTypeLower.includes("pending") || eventTypeLower.includes("paymentcreated") || eventTypeLower.includes("paid")) {
    return CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: eventTypeLower.includes("pending") ? "confirming" : "paid" }
    });
  }
  if (!eventTypeLower.includes("completed")) {
    return purchase;
  }

  const invoice = await retrieveCoinPaymentsInvoice(invoiceId);
  const payment = firstPayment(invoice, purchase.coinpayments?.networkCode || "");
  const status = sanitizeString(invoice?.status || payload?.invoice?.status || payload?.status, 80).toLowerCase();
  const expected = sanitizeString(payment?.expectedAmount || purchase.coinpayments?.expectedAmount || "", 80);
  const received = sanitizeString(payment?.actualAmount || payment?.receivedAmount || purchase.coinpayments?.receivedAmount || "", 80);
  const networkCode = sanitizeString(payment?.paymentCurrencyId || purchase.coinpayments?.networkCode || "", 160);

  if (networkCode && purchase.coinpayments?.networkCode && networkCode !== purchase.coinpayments.networkCode) {
    await CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "review_required", reviewReason: "CoinPayments network did not match the selected USDT network." }
    });
    throw new PaymentValidationError("network_mismatch");
  }

  await CreditPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      "coinpayments.expectedAmount": expected || purchase.coinpayments?.expectedAmount,
      "coinpayments.receivedAmount": received || purchase.coinpayments?.receivedAmount,
      "coinpayments.paymentAddress": sanitizeString(payment?.paymentAddress || purchase.coinpayments?.paymentAddress || "", 220),
      "coinpayments.transactionHash": sanitizeString(payment?.receivedBlockchainTxId || purchase.coinpayments?.transactionHash || "", 220),
      "coinpayments.confirmations": Number.isFinite(Number(payment?.confirmations)) ? Number(payment.confirmations) : purchase.coinpayments?.confirmations,
      "coinpayments.requiredConfirmations": Number.isFinite(Number(payment?.requiredConfirmations)) ? Number(payment.requiredConfirmations) : purchase.coinpayments?.requiredConfirmations
    }
  });

  if (status !== "completed" && !eventTypeLower.includes("completed")) return purchase;
  if (expected && received && compareDecimalStrings(received, expected) < 0) {
    return CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "underpaid", reviewReason: "CoinPayments reported less USDT than expected." }
    });
  }

  const finalStatus = expected && received && compareDecimalStrings(received, expected) > 0 ? "overpaid" : "paid";
  await CreditPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: finalStatus,
      paidAt: purchase.paidAt || new Date()
    }
  });

  return grantPurchasedCredits({
    purchaseId: purchase._id,
    provider: "coinpayments",
    providerReference: invoiceId
  });
}

export function safeCoinPaymentsPayloadForLog(payload: unknown) {
  return safeJson(payload).slice(0, 800);
}
