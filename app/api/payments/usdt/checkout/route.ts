export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { createCreditPurchase } from "@/lib/payments/purchases";
import { PaymentConfigurationError, PaymentValidationError, safePaymentErrorCode } from "@/lib/payments/errors";
import { createCoinPaymentsInvoice } from "@/lib/payments/providers/coinpayments";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { usdtCheckoutSchema } from "@/schemas/payment.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `usdt-checkout:${meta.ip}`,
    limit: 6,
    windowMs: 60 * 1000,
    operation: "usdt-checkout"
  });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(usdtCheckoutSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const created = await createCreditPurchase({
      userId: auth.user._id,
      packId: parsed.data.packId,
      provider: "coinpayments",
      paymentMethod: "usdt"
    });
    if (!created) return apiError("BAD_REQUEST", "Choose a valid credit pack.");

    const checkout = await createCoinPaymentsInvoice({
      purchaseId: String(created.purchase._id),
      userId: String(auth.user._id),
      email: auth.user.email,
      pack: created.pack,
      networkId: parsed.data.network
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
          provider: "coinpayments",
          paymentMethod: "usdt",
          checkoutUrl: checkout.checkoutUrl,
          purchaseId: String(created.purchase._id),
          invoiceId: checkout.invoiceId,
          network: checkout.network,
          warning: checkout.warning,
          message: "USDT checkout is ready.",
          nextAction: "redirect"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    logSafeError("payments.usdt.checkout", error, { errorCategory: safePaymentErrorCode(error) });
    if (error instanceof PaymentConfigurationError) {
      return apiError("SETUP_REQUIRED", "USDT payments are not configured yet.", {
        details: { missing: error.missing }
      });
    }
    if (error instanceof PaymentValidationError && error.code === "unsupported_usdt_network") {
      return apiError("BAD_REQUEST", "Choose a supported USDT network.");
    }
    return apiError("INTERNAL_ERROR", "Unable to start USDT checkout right now.");
  }
}
