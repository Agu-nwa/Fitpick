export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { fulfilRevenueCatCreditPurchase, verifyRevenueCatWebhook } from "@/lib/payments/providers/app-store";
import { PaymentConfigurationError, PaymentValidationError, safePaymentErrorCode } from "@/lib/payments/errors";
import { logSafeError } from "@/lib/security/safe-log";

export async function POST(request: NextRequest) {
  try {
    if (!verifyRevenueCatWebhook(request.headers.get("authorization"))) {
      return apiError("UNAUTHORIZED", "Webhook authorization failed.");
    }

    await connectDB();
    const payload = await request.json();
    const result = await fulfilRevenueCatCreditPurchase(payload);

    return apiSuccess({
      received: true,
      ignored: Boolean(result.ignored),
      reason: result.ignored ? result.reason : undefined
    });
  } catch (error) {
    logSafeError("webhooks.revenuecat", error, { errorCategory: safePaymentErrorCode(error) });
    if (error instanceof PaymentConfigurationError) return apiError("SETUP_REQUIRED", "App Store payments are not configured.");
    if (error instanceof PaymentValidationError) return apiError("BAD_REQUEST", "Unable to verify this App Store purchase.");
    return apiError("INTERNAL_ERROR", "Unable to process this App Store purchase right now.");
  }
}
