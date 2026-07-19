export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { apiError, apiSuccess } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { constructStripeEvent, fulfilStripeCheckoutSession, handleStripeChargeRefunded, handleStripeDispute, markStripePaymentIntent } from "@/lib/payments/providers/stripe";
import { logSafeError } from "@/lib/security/safe-log";
import { CreditPurchase } from "@/models/CreditPurchase";
import { ProcessedPaymentEvent } from "@/models/ProcessedPaymentEvent";

async function claimEvent(provider: "stripe", eventId: string, eventType: string) {
  try {
    const event = await ProcessedPaymentEvent.create({ provider, eventId, eventType, processingStatus: "processing" });
    return { event, duplicate: false };
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const existing = await ProcessedPaymentEvent.findOne({ provider, eventId });
    if (existing?.processingStatus === "failed") {
      existing.processingStatus = "processing";
      existing.errorCode = undefined;
      await existing.save();
      return { event: existing, duplicate: false };
    }
    return { event: existing, duplicate: true };
  }
}

async function markEvent(eventId: string, processingStatus: "processed" | "ignored" | "failed", errorCode?: string, purchaseId?: unknown) {
  await ProcessedPaymentEvent.updateOne(
    { provider: "stripe", eventId },
    {
      $set: {
        processingStatus,
        processedAt: new Date(),
        ...(errorCode ? { errorCode } : {}),
        ...(purchaseId ? { purchaseId } : {})
      }
    }
  );
}

async function processStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const result = await fulfilStripeCheckoutSession(session.id);
      return { status: "processed" as const, purchaseId: result.purchase._id };
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await CreditPurchase.findOneAndUpdate(
        { provider: "stripe", "stripe.checkoutSessionId": session.id },
        { $set: { status: "failed" } }
      );
      return { status: "processed" as const };
    }
    case "payment_intent.succeeded": {
      await markStripePaymentIntent({ intent: event.data.object as Stripe.PaymentIntent, succeeded: true });
      return { status: "processed" as const };
    }
    case "payment_intent.payment_failed": {
      await markStripePaymentIntent({ intent: event.data.object as Stripe.PaymentIntent, succeeded: false });
      return { status: "processed" as const };
    }
    case "charge.refunded": {
      await handleStripeChargeRefunded(event.data.object as Stripe.Charge);
      return { status: "processed" as const };
    }
    case "charge.dispute.created": {
      await handleStripeDispute({ dispute: event.data.object as Stripe.Dispute });
      return { status: "processed" as const };
    }
    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      await handleStripeDispute({ dispute, lost: dispute.status === "lost" });
      return { status: "processed" as const };
    }
    default:
      return { status: "ignored" as const };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body.length > 1024 * 1024) return apiError("BAD_REQUEST", "Webhook payload is too large.");

    const event = constructStripeEvent(body, request.headers.get("stripe-signature"));
    if (!event) return apiError("SETUP_REQUIRED", "Stripe webhook is not configured.");

    await connectDB();
    const claim = await claimEvent("stripe", event.id, event.type);
    if (claim.duplicate) {
      return apiSuccess({ received: true, duplicate: true });
    }

    try {
      const result = await processStripeEvent(event);
      await markEvent(event.id, result.status, undefined, result.purchaseId);
      return apiSuccess({ received: true, status: result.status });
    } catch (error: any) {
      const errorCode = error?.code || error?.name || "stripe_event_failed";
      await markEvent(event.id, "failed", String(errorCode).slice(0, 120));
      logSafeError("webhooks.stripe.process", error, { eventType: event.type, errorCode });
      return apiSuccess({ received: true, status: "recorded_for_retry" });
    }
  } catch (error) {
    logSafeError("webhooks.stripe", error);
    return apiError("BAD_REQUEST", "Webhook could not be processed.");
  }
}
