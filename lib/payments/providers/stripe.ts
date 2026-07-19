import Stripe from "stripe";
import { CreditPurchase } from "@/models/CreditPurchase";
import { grantPurchasedCredits } from "@/lib/payments/fulfilment";
import { PaymentConfigurationError, PaymentValidationError } from "@/lib/payments/errors";
import { reversePurchasedCreditsForRefund } from "@/lib/payments/refunds";
import { formatUsdMinor, type CreditPack } from "@/lib/payments/packs";

export function stripeReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new PaymentConfigurationError(["STRIPE_SECRET_KEY"]);
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function stripeProviderReadiness() {
  const missing = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  return {
    configured: missing.length === 0,
    currencies: ["USD" as const],
    paymentMethods: ["fiat" as const],
    message: missing.length ? `Missing ${missing.join(", ")}` : "Stripe one-time Checkout is configured."
  };
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function constructStripeEvent(body: string, signature: string | null) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return null;
  return stripeClient().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

export async function createStripeCheckout(input: {
  purchaseId: string;
  userId: string;
  email: string;
  pack: CreditPack;
}) {
  const missing = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (missing.length) throw new PaymentConfigurationError(missing);

  const baseUrl = appUrl();
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.purchaseId,
    customer_email: input.email,
    locale: "auto",
    success_url: `${baseUrl}/wallet/payment/success?purchaseId=${input.purchaseId}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/wallet?payment=cancelled&purchaseId=${input.purchaseId}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.pack.amountMinor,
          product_data: {
            name: `${input.pack.name} Credits`,
            description: `${input.pack.credits} MyFitPick Credits`,
            metadata: {
              packId: input.pack.id
            }
          }
        }
      }
    ],
    metadata: {
      purchaseId: input.purchaseId,
      userId: input.userId,
      packId: input.pack.id,
      paymentKind: "credit_purchase"
    },
    payment_intent_data: {
      metadata: {
        purchaseId: input.purchaseId,
        userId: input.userId,
        packId: input.pack.id,
        paymentKind: "credit_purchase"
      }
    }
  });

  if (!session.url) throw new PaymentValidationError("missing_checkout_url");

  await CreditPurchase.findByIdAndUpdate(input.purchaseId, {
    $set: {
      status: "pending",
      providerReference: session.id,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      stripe: {
        checkoutSessionId: session.id,
        customerId: typeof session.customer === "string" ? session.customer : undefined
      }
    }
  });

  return {
    checkoutUrl: session.url,
    checkoutSessionId: session.id
  };
}

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return undefined;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
}

function paymentIntentFromCharge(charge: Stripe.Charge | Stripe.Dispute) {
  const paymentIntent = "payment_intent" in charge ? charge.payment_intent : undefined;
  if (!paymentIntent) return undefined;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

export async function fulfilStripeCheckoutSession(sessionId: string) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent", "payment_intent.latest_charge"]
  });

  const purchaseId = session.client_reference_id || session.metadata?.purchaseId;
  if (!purchaseId) throw new PaymentValidationError("missing_purchase_id");
  if (session.mode !== "payment") throw new PaymentValidationError("wrong_session_mode");
  if (session.payment_status !== "paid") throw new PaymentValidationError("payment_not_paid");

  const purchase = await CreditPurchase.findById(purchaseId);
  if (!purchase) throw new PaymentValidationError("purchase_not_found");
  if (purchase.provider !== "stripe") throw new PaymentValidationError("provider_mismatch");
  if (purchase.stripe?.checkoutSessionId && purchase.stripe.checkoutSessionId !== session.id) {
    throw new PaymentValidationError("checkout_session_mismatch");
  }
  if (session.amount_total !== purchase.amountMinor || String(session.currency || "").toUpperCase() !== purchase.currency) {
    await CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "review_required", reviewReason: "Stripe amount or currency did not match the trusted purchase." }
    });
    throw new PaymentValidationError("amount_currency_mismatch");
  }

  const intent = typeof session.payment_intent === "object" && session.payment_intent ? session.payment_intent : null;
  const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  await CreditPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: "paid",
      paidAt: purchase.paidAt || new Date(),
      providerReference: session.id,
      stripe: {
        checkoutSessionId: session.id,
        paymentIntentId: paymentIntentId(session),
        chargeId: charge?.id,
        customerId: typeof session.customer === "string" ? session.customer : undefined,
        paymentMethodType: intent?.payment_method_types?.[0],
        amountReceived: session.amount_total || purchase.amountMinor,
        currencyReceived: String(session.currency || "USD").toUpperCase()
      }
    }
  });

  return grantPurchasedCredits({
    purchaseId: purchase._id,
    provider: "stripe",
    providerReference: session.id
  });
}

export async function markStripePaymentIntent(input: { intent: Stripe.PaymentIntent; succeeded: boolean }) {
  const purchaseId = input.intent.metadata?.purchaseId;
  const filter = purchaseId
    ? { _id: purchaseId, provider: "stripe" }
    : { "stripe.paymentIntentId": input.intent.id, provider: "stripe" };

  return CreditPurchase.findOneAndUpdate(
    filter,
    {
      $set: {
        status: input.succeeded ? "paid" : "failed",
        paidAt: input.succeeded ? new Date() : undefined,
        "stripe.paymentIntentId": input.intent.id,
        "stripe.amountReceived": input.intent.amount_received,
        "stripe.currencyReceived": String(input.intent.currency || "USD").toUpperCase()
      }
    },
    { new: true }
  );
}

export async function handleStripeChargeRefunded(charge: Stripe.Charge) {
  const intentId = paymentIntentFromCharge(charge);
  if (!intentId) return null;
  const purchase = await CreditPurchase.findOne({ provider: "stripe", "stripe.paymentIntentId": intentId });
  if (!purchase) return null;
  const refundedAmount = charge.amount_refunded || 0;
  if (refundedAmount <= 0) return purchase;

  return reversePurchasedCreditsForRefund({
    purchaseId: purchase._id,
    amountMinor: Math.min(refundedAmount, purchase.amountMinor),
    providerRefundId: charge.refunds?.data?.[0]?.id || charge.id,
    reason: "Stripe refund webhook"
  });
}

export async function handleStripeDispute(input: { dispute: Stripe.Dispute; lost?: boolean }) {
  const intentId = paymentIntentFromCharge(input.dispute);
  const purchase = intentId
    ? await CreditPurchase.findOne({ provider: "stripe", "stripe.paymentIntentId": intentId })
    : null;
  if (!purchase) return null;

  if (input.lost) {
    await CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "chargeback", reviewReason: "Stripe dispute closed against FitPick." }
    });
    return reversePurchasedCreditsForRefund({
      purchaseId: purchase._id,
      amountMinor: purchase.amountMinor,
      providerRefundId: input.dispute.id,
      reason: "Stripe chargeback"
    });
  }

  return CreditPurchase.findByIdAndUpdate(
    purchase._id,
    {
      $set: {
        status: "disputed",
        reviewReason: `Stripe dispute ${input.dispute.status || "created"}.`,
        "stripe.chargeId": typeof input.dispute.charge === "string" ? input.dispute.charge : input.dispute.charge?.id
      }
    },
    { new: true }
  );
}

export function stripeCheckoutPricingNote() {
  return `Stripe uses one-time Checkout Sessions with server-generated price_data from trusted pack amounts (${Object.values({
    starter: 499,
    popular: 999,
    pro: 1999,
    creator: 3999
  }).map((amount) => `$${formatUsdMinor(amount)}`).join(", ")}).`;
}
