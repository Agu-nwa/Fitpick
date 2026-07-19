export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { PaymentConfigurationError, safePaymentErrorCode } from "@/lib/payments/errors";
import {
  processCoinPaymentsInvoiceEvent,
  safeCoinPaymentsEventId,
  verifyCoinPaymentsWebhook
} from "@/lib/payments/providers/coinpayments";
import { logSafeError } from "@/lib/security/safe-log";
import { ProcessedPaymentEvent } from "@/models/ProcessedPaymentEvent";

async function claimEvent(eventId: string, eventType: string) {
  try {
    const event = await ProcessedPaymentEvent.create({
      provider: "coinpayments",
      eventId,
      eventType,
      processingStatus: "processing"
    });
    return { event, duplicate: false };
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const existing = await ProcessedPaymentEvent.findOne({ provider: "coinpayments", eventId });
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
    { provider: "coinpayments", eventId },
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    if (body.length > 1024 * 1024) return apiError("BAD_REQUEST", "Webhook payload is too large.");

    const registeredUrl = process.env.COINPAYMENTS_WEBHOOK_URL || request.url;
    const verified = verifyCoinPaymentsWebhook({
      method: request.method,
      url: registeredUrl,
      rawBody: body,
      headers: request.headers
    });
    if (!verified.ok) {
      return apiError("FORBIDDEN", "Webhook signature could not be verified.");
    }

    const payload = JSON.parse(body);
    const eventType = String(payload?.type || payload?.event || payload?.eventType || "unknown").slice(0, 120);
    const eventId = safeCoinPaymentsEventId(payload, body);

    await connectDB();
    const claim = await claimEvent(eventId, eventType);
    if (claim.duplicate) {
      return apiSuccess({ received: true, duplicate: true });
    }

    try {
      const result: any = await processCoinPaymentsInvoiceEvent(payload);
      await markEvent(eventId, "processed", undefined, result?.purchase?._id || result?._id);
      return apiSuccess({ received: true, status: "processed" });
    } catch (error: any) {
      const errorCode = String(error?.code || error?.name || safePaymentErrorCode(error)).slice(0, 120);
      await markEvent(eventId, "failed", errorCode);
      logSafeError("webhooks.coinpayments.process", error, { eventType, errorCode });
      return apiSuccess({ received: true, status: "recorded_for_retry" });
    }
  } catch (error) {
    logSafeError("webhooks.coinpayments", error);
    if (error instanceof PaymentConfigurationError) {
      return apiError("SETUP_REQUIRED", "USDT webhook is not configured.", {
        details: { missing: error.missing }
      });
    }
    return apiError("BAD_REQUEST", "Webhook could not be processed.");
  }
}
