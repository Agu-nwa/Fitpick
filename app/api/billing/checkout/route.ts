export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { createProviderCheckout } from "@/lib/payments";
import { readJson, validateBody } from "@/lib/validation";
import { BillingEvent } from "@/models/BillingEvent";
import { checkoutSchema } from "@/schemas/billing.schema";
import type { BillingCurrency } from "@/types/payment";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(checkoutSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const currency = (parsed.data.currency || (parsed.data.provider === "paystack" ? "NGN" : "USD")) as BillingCurrency;
    const checkout = await createProviderCheckout({
      userId: String(auth.user._id),
      email: auth.user.email,
      provider: parsed.data.provider || "auto",
      plan: parsed.data.plan,
      currency,
      successUrl: parsed.data.successUrl,
      cancelUrl: parsed.data.cancelUrl
    });

    const event = await BillingEvent.create({
      userId: auth.user._id,
      provider: checkout.provider,
      eventType: "checkout.requested",
      status: checkout.ready ? "ready" : "not_configured",
      metadata: { plan: parsed.data.plan, currency, nextAction: checkout.nextAction }
    });

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "billing.checkout",
      entityType: "BillingEvent",
      entityId: String(event._id)
    });

    return apiSuccess({ checkout }, { message: checkout.ready ? "Checkout created." : "This payment option is not configured yet." });
  } catch (error) {
    console.error("FitPick checkout error:", error);
    return apiError("INTERNAL_ERROR", "Unable to start checkout right now.");
  }
}
