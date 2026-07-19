export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { createCreditPurchase } from "@/lib/payments/purchases";
import { createStripeCheckout } from "@/lib/payments/providers/stripe";
import { PaymentConfigurationError, safePaymentErrorCode } from "@/lib/payments/errors";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { stripeCheckoutSchema } from "@/schemas/payment.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `stripe-checkout:${meta.ip}`,
    limit: 8,
    windowMs: 60 * 1000,
    operation: "stripe-checkout"
  });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(stripeCheckoutSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const created = await createCreditPurchase({
      userId: auth.user._id,
      packId: parsed.data.packId,
      provider: "stripe",
      paymentMethod: "fiat"
    });
    if (!created) return apiError("BAD_REQUEST", "Choose a valid credit pack.");

    const checkout = await createStripeCheckout({
      purchaseId: String(created.purchase._id),
      userId: String(auth.user._id),
      email: auth.user.email,
      pack: created.pack
    });

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "payment.checkout",
      entityType: "CreditPurchase",
      entityId: String(created.purchase._id)
    });

    return apiSuccess(
      {
        checkout: {
          ready: true,
          provider: "stripe",
          paymentMethod: "fiat",
          checkoutUrl: checkout.checkoutUrl,
          purchaseId: String(created.purchase._id),
          message: "Stripe Checkout is ready.",
          nextAction: "redirect"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    logSafeError("payments.stripe.checkout", error, { errorCategory: safePaymentErrorCode(error) });
    if (error instanceof PaymentConfigurationError) {
      return apiError("SETUP_REQUIRED", "Card payments are not configured yet.", {
        details: { missing: error.missing }
      });
    }
    return apiError("INTERNAL_ERROR", "Unable to start card checkout right now.");
  }
}
