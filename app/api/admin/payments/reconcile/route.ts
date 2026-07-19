export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { reconcileCreditPurchase } from "@/lib/payments/reconciliation";
import { serializeCreditPurchase } from "@/lib/payments/purchases";
import { PaymentConfigurationError, PaymentValidationError, safePaymentErrorCode } from "@/lib/payments/errors";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { readJson, validateBody } from "@/lib/validation";
import { adminReconcileSchema } from "@/schemas/payment.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `admin-payment-reconcile:${meta.ip}`,
    limit: 12,
    windowMs: 60 * 1000,
    operation: "admin-payment-reconcile"
  });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(adminReconcileSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    if (!isObjectId(parsed.data.purchaseId)) return apiError("NOT_FOUND", "Purchase was not found.");

    const result = await reconcileCreditPurchase(parsed.data.purchaseId);
    const purchase = "purchase" in Object(result) ? (result as any).purchase : result;
    if (!purchase) return apiError("NOT_FOUND", "Purchase was not found.");

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "payment.reconcile",
      entityType: "CreditPurchase",
      entityId: parsed.data.purchaseId
    });

    return apiSuccess({ purchase: serializeCreditPurchase(purchase) }, { message: "Purchase reconciled." });
  } catch (error) {
    logSafeError("admin.payments.reconcile", error, { errorCategory: safePaymentErrorCode(error) });
    if (error instanceof PaymentConfigurationError) return apiError("SETUP_REQUIRED", "Payment reconciliation is not configured.");
    if (error instanceof PaymentValidationError) return apiError("BAD_REQUEST", "This purchase could not be reconciled automatically.");
    return apiError("INTERNAL_ERROR", "Unable to reconcile this purchase right now.");
  }
}
