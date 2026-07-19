export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { refundStripeCreditPurchase } from "@/lib/payments/refunds";
import { serializeCreditPurchase } from "@/lib/payments/purchases";
import { PaymentConfigurationError, PaymentValidationError, safePaymentErrorCode } from "@/lib/payments/errors";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { readJson, validateBody } from "@/lib/validation";
import { adminRefundSchema } from "@/schemas/payment.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `admin-payment-refund:${meta.ip}`,
    limit: 6,
    windowMs: 60 * 1000,
    operation: "admin-payment-refund"
  });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(adminRefundSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    if (!isObjectId(parsed.data.purchaseId)) return apiError("NOT_FOUND", "Purchase was not found.");

    const purchase = await refundStripeCreditPurchase(parsed.data);
    if (!purchase) return apiError("NOT_FOUND", "Purchase was not found.");

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "payment.refund",
      entityType: "CreditPurchase",
      entityId: parsed.data.purchaseId
    });

    return apiSuccess({ purchase: serializeCreditPurchase(purchase) }, { message: "Refund recorded." });
  } catch (error) {
    logSafeError("admin.payments.refund", error, { errorCategory: safePaymentErrorCode(error) });
    if (error instanceof PaymentConfigurationError) return apiError("SETUP_REQUIRED", "Stripe refunds are not configured.");
    if (error instanceof PaymentValidationError) return apiError("BAD_REQUEST", "This purchase cannot be refunded automatically.");
    return apiError("INTERNAL_ERROR", "Unable to refund this purchase right now.");
  }
}
