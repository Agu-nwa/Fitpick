export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { serializeCreditPurchase } from "@/lib/payments/purchases";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { CreditPurchase } from "@/models/CreditPurchase";
import { purchaseIdParamSchema } from "@/schemas/payment.schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `payment-purchase:${meta.ip}`,
    limit: 90,
    windowMs: 60 * 1000,
    operation: "payment-purchase"
  });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = purchaseIdParamSchema.safeParse(await params);
    if (!parsed.success) return apiError("NOT_FOUND", "Purchase was not found.");
    if (!isObjectId(parsed.data.purchaseId)) return apiError("NOT_FOUND", "Purchase was not found.");

    const purchase = await CreditPurchase.findOne({
      _id: parsed.data.purchaseId,
      userId: auth.user._id
    }).lean();
    if (!purchase) return apiError("NOT_FOUND", "Purchase was not found.");

    return apiSuccess({ purchase: serializeCreditPurchase(purchase) });
  } catch (error) {
    logSafeError("payments.purchase.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load this payment right now.");
  }
}
