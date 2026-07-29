import crypto from "crypto";
import { Types } from "mongoose";
import { ExternalSupportWebhookEvent, type ExternalSupportWebhookEventDocument } from "@/models/ExternalSupportWebhookEvent";
import { SupportTenant } from "@/models/SupportTenant";

type WebhookEventType = "conversation.created" | "message.created" | "conversation.updated";

function compactText(value: string, max = 240) {
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function asObjectId(value: string) {
  if (!Types.ObjectId.isValid(value)) throw new Error("invalid_object_id");
  return new Types.ObjectId(value);
}

export function generateWebhookSigningSecret() {
  return `whsec_${crypto.randomBytes(32).toString("base64url")}`;
}

function signWebhookPayload(input: { secret: string; timestamp: number; body: string }) {
  return crypto.createHmac("sha256", input.secret).update(`${input.timestamp}.${input.body}`).digest("hex");
}

export function serializeWebhookEvent(event: ExternalSupportWebhookEventDocument) {
  return {
    id: String(event._id),
    tenantId: String(event.tenantId),
    eventType: event.eventType,
    status: event.status,
    attempts: event.attempts || 0,
    maxAttempts: event.maxAttempts || 5,
    nextAttemptAt: event.nextAttemptAt?.toISOString() || null,
    lastStatusCode: event.lastStatusCode ?? null,
    lastError: event.lastError || "",
    deliveredAt: event.deliveredAt?.toISOString() || null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

export async function enqueueSupportWebhookEvent(input: {
  tenantId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
}) {
  const tenant = await SupportTenant.findById(asObjectId(input.tenantId)).select("+webhookSigningSecret webhookUrl status");
  if (!tenant?.webhookUrl || tenant.status !== "active") return null;

  const event = await ExternalSupportWebhookEvent.create({
    tenantId: tenant._id,
    eventType: input.eventType,
    payload: {
      id: crypto.randomUUID(),
      type: input.eventType,
      tenantId: String(tenant._id),
      createdAt: new Date().toISOString(),
      data: input.payload
    }
  });

  void deliverSupportWebhookEvent(String(event._id));
  return serializeWebhookEvent(event);
}

export async function listSupportWebhookEvents(input: { tenantId?: string; status?: "all" | "queued" | "delivered" | "failed" | "dead_letter"; limit?: number }) {
  const query: Record<string, unknown> = {};
  if (input.tenantId) query.tenantId = asObjectId(input.tenantId);
  if (input.status && input.status !== "all") query.status = input.status;
  const events = await ExternalSupportWebhookEvent.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(input.limit || 50, 1), 100));
  return events.map(serializeWebhookEvent);
}

export async function deliverSupportWebhookEvent(eventId: string) {
  const event = await ExternalSupportWebhookEvent.findById(asObjectId(eventId));
  if (!event || event.status === "delivered" || event.status === "dead_letter") return event ? serializeWebhookEvent(event) : null;

  const tenant = await SupportTenant.findById(event.tenantId).select("+webhookSigningSecret webhookUrl status");
  if (!tenant?.webhookUrl || tenant.status !== "active" || !tenant.webhookSigningSecret) {
    const updated = await ExternalSupportWebhookEvent.findByIdAndUpdate(
      event._id,
      { $set: { status: "dead_letter", lastError: "Webhook is not configured." } },
      { new: true }
    ).orFail();
    return serializeWebhookEvent(updated);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(event.payload || {});
  const signature = signWebhookPayload({ secret: tenant.webhookSigningSecret, timestamp, body });

  try {
    const response = await fetch(tenant.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "MyFitPick-Support-Webhooks/1.0",
        "x-myfitpick-event-id": String(event._id),
        "x-myfitpick-event-type": event.eventType,
        "x-myfitpick-timestamp": String(timestamp),
        "x-myfitpick-signature": `v1=${signature}`
      },
      body,
      signal: AbortSignal.timeout(10_000)
    });

    const delivered = response.status >= 200 && response.status < 300;
    const attempts = (event.attempts || 0) + 1;
    const terminal = attempts >= (event.maxAttempts || 5);
    const nextDelayMs = Math.min(60 * 60_000, 2 ** attempts * 60_000);
    const updated = await ExternalSupportWebhookEvent.findByIdAndUpdate(
      event._id,
      {
        $set: delivered
          ? { status: "delivered", deliveredAt: new Date(), lastStatusCode: response.status, lastError: "" }
          : {
              status: terminal ? "dead_letter" : "failed",
              lastStatusCode: response.status,
              lastError: `Webhook endpoint returned ${response.status}.`,
              nextAttemptAt: new Date(Date.now() + nextDelayMs)
            },
        $inc: { attempts: 1 }
      },
      { new: true }
    ).orFail();
    return serializeWebhookEvent(updated);
  } catch {
    const attempts = (event.attempts || 0) + 1;
    const terminal = attempts >= (event.maxAttempts || 5);
    const nextDelayMs = Math.min(60 * 60_000, 2 ** attempts * 60_000);
    const updated = await ExternalSupportWebhookEvent.findByIdAndUpdate(
      event._id,
      {
        $set: {
          status: terminal ? "dead_letter" : "failed",
          lastError: compactText("Webhook delivery failed."),
          nextAttemptAt: new Date(Date.now() + nextDelayMs)
        },
        $inc: { attempts: 1 }
      },
      { new: true }
    ).orFail();
    return serializeWebhookEvent(updated);
  }
}

export async function retrySupportWebhookEvent(input: { eventId: string }) {
  const event = await ExternalSupportWebhookEvent.findByIdAndUpdate(
    asObjectId(input.eventId),
    { $set: { status: "queued", nextAttemptAt: new Date(), lastError: "" } },
    { new: true }
  );
  if (!event) throw new Error("support_webhook_event_not_found");
  return deliverSupportWebhookEvent(String(event._id));
}
