export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { logSafeError } from "@/lib/security/safe-log";
import { verifyPaystackSignature } from "@/lib/payments/webhooks";
import { BillingEvent } from "@/models/BillingEvent";
import { PlusSubscription } from "@/models/PlusSubscription";

async function updateSubscriptionFromPaystack(event: any) {
  const data = event.data || {};
  const userId = data.metadata?.userId || data.customer?.metadata?.userId;
  if (!userId) return;

  const active = event.event === "charge.success" || event.event === "subscription.create";
  await PlusSubscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        provider: "paystack",
        providerCustomerId: String(data.customer?.customer_code || ""),
        providerSubscriptionId: String(data.subscription?.subscription_code || data.subscription || ""),
        providerPlanId: process.env.FITPICK_PLUS_PAYSTACK_PLAN_CODE || "",
        status: active ? "active" : event.event === "subscription.disable" ? "canceled" : "inactive",
        plan: active ? "plus" : "free",
        currency: "NGN",
        amount: data.amount ? Number(data.amount) / 100 : 0,
        metadata: { lastPaystackEvent: event.event }
      }
    },
    { upsert: true, new: true }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body.length > 1024 * 1024) return apiError("BAD_REQUEST", "Webhook payload is too large.");
    if (!process.env.PAYSTACK_WEBHOOK_SECRET) return apiError("SETUP_REQUIRED", "Paystack webhook is not configured.");
    if (!verifyPaystackSignature(body, request.headers.get("x-paystack-signature"))) {
      return apiError("FORBIDDEN", "Webhook signature could not be verified.");
    }

    const event = JSON.parse(body);
    if (["charge.success", "subscription.create", "subscription.disable", "invoice.create", "invoice.payment_failed"].includes(event.event)) {
      await updateSubscriptionFromPaystack(event);
    }

    await BillingEvent.create({
      provider: "paystack",
      eventType: event.event || "unknown",
      providerEventId: String(event.data?.id || event.data?.reference || ""),
      status: "received",
      metadata: { event: event.event }
    });

    return apiSuccess({ received: true });
  } catch (error) {
    logSafeError("billing.webhook.paystack", error);
    return apiError("BAD_REQUEST", "Webhook could not be processed.");
  }
}
