export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logSafeError } from "@/lib/security/safe-log";
import { constructStripeEvent } from "@/lib/payments/webhooks";
import { BillingEvent } from "@/models/BillingEvent";
import { PlusSubscription } from "@/models/PlusSubscription";

async function updateSubscriptionFromStripe(event: any) {
  const object = event.data?.object || {};
  const userId = object.metadata?.userId || object.subscription_details?.metadata?.userId;
  if (!userId) return;

  const status = object.status === "active" || object.payment_status === "paid" ? "active" : object.status || "inactive";
  await PlusSubscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        provider: "stripe",
        providerCustomerId: object.customer || "",
        providerSubscriptionId: object.subscription || object.id || "",
        providerPlanId: process.env.FITPICK_PLUS_STRIPE_PRICE_ID || process.env.FITPICK_PLUS_PRICE_ID || "",
        status: ["active", "trialing"].includes(status) ? status : status === "canceled" ? "canceled" : "inactive",
        plan: ["active", "trialing"].includes(status) ? "plus" : "free",
        currency: "USD",
        metadata: { lastStripeEvent: event.type }
      }
    },
    { upsert: true, new: true }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body.length > 1024 * 1024) return apiError("BAD_REQUEST", "Webhook payload is too large.");
    const event = constructStripeEvent(body, request.headers.get("stripe-signature"));
    if (!event) return apiError("SETUP_REQUIRED", "Stripe webhook is not configured.");

    if ([
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed"
    ].includes(event.type)) {
      await updateSubscriptionFromStripe(event);
    }

    await BillingEvent.create({
      provider: "stripe",
      eventType: event.type,
      providerEventId: event.id,
      status: "received",
      metadata: { type: event.type }
    });

    return apiSuccess({ received: true });
  } catch (error) {
    logSafeError("billing.webhook.stripe", error);
    return apiError("BAD_REQUEST", "Webhook could not be processed.");
  }
}
