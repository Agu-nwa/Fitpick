import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { SupportApiKey, type SupportApiKeyDocument } from "@/models/SupportApiKey";
import { SupportTenant, type SupportTenantDocument } from "@/models/SupportTenant";
import { ExternalSupportConversation, type ExternalSupportConversationDocument } from "@/models/ExternalSupportConversation";
import { ExternalSupportCustomer, type ExternalSupportCustomerDocument } from "@/models/ExternalSupportCustomer";
import { ExternalSupportMessage, type ExternalSupportMessageDocument } from "@/models/ExternalSupportMessage";
import { SupportApiUsageCounter, type SupportApiUsageCounterDocument } from "@/models/SupportApiUsageCounter";
import { SupportApiUsageEvent, type SupportApiUsageEventDocument } from "@/models/SupportApiUsageEvent";
import { enqueueSupportWebhookEvent, generateWebhookSigningSecret } from "@/lib/support-api/webhooks";

export type SupportApiScope = "conversations:read" | "conversations:write" | "messages:read" | "messages:write" | "webhooks:read";

export type SupportApiAuth = {
  tenant: SupportTenantDocument;
  apiKey: SupportApiKeyDocument;
};

function asObjectId(value: string) {
  if (!Types.ObjectId.isValid(value)) throw new Error("invalid_object_id");
  return new Types.ObjectId(value);
}

function compactText(value: string, max = 180) {
  return value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function dateOrNull(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function hashApiKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compactMetadata(metadata?: Record<string, unknown>) {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata || {}).slice(0, 20)) {
    const safeKey = compactText(key, 80);
    if (!safeKey) continue;
    if (typeof value === "string") output[safeKey] = compactText(value, 240);
    else if (typeof value === "number" && Number.isFinite(value)) output[safeKey] = value;
    else if (typeof value === "boolean" || value === null) output[safeKey] = value;
  }
  return output;
}

export function generateSupportApiKey() {
  return `fsp_${crypto.randomBytes(32).toString("base64url")}`;
}

function extractApiKey(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return (match?.[1] || request.headers.get("x-api-key") || "").trim();
}

export async function authenticateSupportApiRequest(request: Request): Promise<SupportApiAuth | null> {
  const rawKey = extractApiKey(request);
  if (!rawKey) return null;

  const apiKey = await SupportApiKey.findOne({ keyHash: hashApiKey(rawKey), status: "active" }).select("+keyHash");
  if (!apiKey) return null;

  const tenant = await SupportTenant.findOne({ _id: apiKey.tenantId, status: "active" });
  if (!tenant) return null;

  await SupportApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } });
  return { tenant, apiKey };
}

export function supportApiHasScope(auth: SupportApiAuth, scope: SupportApiScope) {
  return (auth.apiKey.scopes || []).includes(scope);
}

function currentUsageWindow() {
  const now = new Date();
  const periodKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    periodKey,
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  };
}

function serializeSupportApiUsageCounter(counter: SupportApiUsageCounterDocument | null) {
  return {
    usedUnits: counter?.usedUnits || 0,
    limitSnapshot: counter?.limitSnapshot || 0
  };
}

export async function getSupportApiUsageSummary(input: { tenantId?: string }) {
  const { periodKey, start, end } = currentUsageWindow();
  const match: Record<string, unknown> = {
    createdAt: { $gte: start, $lt: end },
    statusCode: { $gte: 200, $lt: 400 }
  };
  if (input.tenantId) match.tenantId = asObjectId(input.tenantId);

  const [summary] = await SupportApiUsageEvent.aggregate<{ totalUnits: number; totalCalls: number }>([
    { $match: match },
    { $group: { _id: null, totalUnits: { $sum: "$billableUnits" }, totalCalls: { $sum: 1 } } }
  ]);

  const counter = input.tenantId
    ? await SupportApiUsageCounter.findOne({ tenantId: asObjectId(input.tenantId), periodKey })
    : null;
  const serializedCounter = serializeSupportApiUsageCounter(counter);
  const totalUnits = input.tenantId ? Math.max(serializedCounter.usedUnits, summary?.totalUnits || 0) : summary?.totalUnits || 0;

  return {
    periodKey,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    totalUnits,
    totalCalls: summary?.totalCalls || 0,
    counterUnits: serializedCounter.usedUnits,
    limitSnapshot: serializedCounter.limitSnapshot
  };
}

async function ensureSupportApiUsageCounter(auth: SupportApiAuth) {
  const { periodKey, start, end } = currentUsageWindow();
  const tenantId = auth.tenant._id;
  const monthlyUsageLimit = Math.max(auth.tenant.monthlyUsageLimit ?? 10000, 0);
  const existing = await SupportApiUsageCounter.findOne({ tenantId, periodKey });
  if (existing) return existing;

  const summary = await getSupportApiUsageSummary({ tenantId: String(tenantId) });
  try {
    return await SupportApiUsageCounter.create({
      tenantId,
      periodKey,
      periodStart: start,
      periodEnd: end,
      usedUnits: summary.totalUnits,
      limitSnapshot: monthlyUsageLimit
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      return SupportApiUsageCounter.findOne({ tenantId, periodKey }).orFail();
    }
    throw error;
  }
}

export async function reserveSupportApiQuota(auth: SupportApiAuth, nextUnits = 1) {
  const { periodKey } = currentUsageWindow();
  const monthlyUsageLimit = Math.max(auth.tenant.monthlyUsageLimit ?? 10000, 0);
  if (monthlyUsageLimit === 0) {
    return { allowed: false, monthlyUsageLimit, usedUnits: 0, remainingUnits: 0 };
  }

  const units = Math.max(nextUnits, 0);
  const counter = await ensureSupportApiUsageCounter(auth);
  const updated = await SupportApiUsageCounter.findOneAndUpdate(
    {
      _id: counter._id,
      tenantId: auth.tenant._id,
      periodKey,
      usedUnits: { $lte: Math.max(monthlyUsageLimit - units, 0) }
    },
    { $inc: { usedUnits: units }, $set: { limitSnapshot: monthlyUsageLimit } },
    { new: true }
  );

  if (!updated) {
    const latest = await SupportApiUsageCounter.findById(counter._id);
    const usedUnits = latest?.usedUnits || counter.usedUnits || 0;
    return { allowed: false, monthlyUsageLimit, usedUnits, remainingUnits: Math.max(monthlyUsageLimit - usedUnits, 0) };
  }

  const usedUnits = updated.usedUnits || 0;
  return {
    allowed: true,
    monthlyUsageLimit,
    usedUnits,
    remainingUnits: Math.max(monthlyUsageLimit - usedUnits, 0)
  };
}

export async function releaseSupportApiQuota(auth: SupportApiAuth, units = 1) {
  const { periodKey } = currentUsageWindow();
  const safeUnits = Math.max(units, 0);
  if (!safeUnits) return;
  await SupportApiUsageCounter.updateOne(
    { tenantId: auth.tenant._id, periodKey, usedUnits: { $gte: safeUnits } },
    { $inc: { usedUnits: -safeUnits } }
  );
}

export function serializeSupportApiUsageEvent(event: SupportApiUsageEventDocument) {
  return {
    id: String(event._id),
    tenantId: String(event.tenantId),
    apiKeyId: String(event.apiKeyId),
    operation: event.operation,
    method: event.method,
    path: event.path,
    statusCode: event.statusCode,
    billableUnits: event.billableUnits || 0,
    metadata: event.metadata || {},
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString()
  };
}

export async function recordSupportApiUsage(input: {
  auth: SupportApiAuth;
  operation: string;
  method: string;
  path: string;
  statusCode: number;
  billableUnits?: number;
  metadata?: Record<string, unknown>;
}) {
  await SupportApiUsageEvent.create({
    tenantId: input.auth.tenant._id,
    apiKeyId: input.auth.apiKey._id,
    operation: compactText(input.operation, 120),
    method: compactText(input.method.toUpperCase(), 12),
    path: compactText(input.path, 240),
    statusCode: input.statusCode,
    billableUnits: Math.max(input.billableUnits ?? 1, 0),
    metadata: compactMetadata(input.metadata)
  });
}

export async function listSupportApiUsage(input: { tenantId?: string; operation?: string; limit?: number }) {
  const query: Record<string, unknown> = {};
  if (input.tenantId) query.tenantId = asObjectId(input.tenantId);
  if (input.operation) query.operation = compactText(input.operation, 120);

  const events = await SupportApiUsageEvent.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(input.limit || 100, 1), 500));

  return events.map(serializeSupportApiUsageEvent);
}

export async function createSupportApiTenant(input: {
  name: string;
  slug: string;
  apiKeyName: string;
  apiKeyScopes?: SupportApiScope[];
  webhookUrl?: string;
  allowedOrigins?: string[];
  rateLimitPerMinute?: number;
  monthlyUsageLimit?: number;
  createdByUserId: string;
}) {
  const rawKey = generateSupportApiKey();
  const webhookSigningSecret = generateWebhookSigningSecret();
  const tenant = await SupportTenant.create({
    name: compactText(input.name, 120),
    slug: input.slug,
    webhookUrl: compactText(input.webhookUrl || "", 500),
    webhookSigningSecret,
    allowedOrigins: (input.allowedOrigins || []).map((origin) => compactText(origin, 240)).filter(Boolean),
    rateLimitPerMinute: input.rateLimitPerMinute || 120,
    monthlyUsageLimit: input.monthlyUsageLimit ?? 10000,
    createdByUserId: asObjectId(input.createdByUserId)
  });

  const apiKey = await SupportApiKey.create({
    tenantId: tenant._id,
    name: compactText(input.apiKeyName, 120),
    keyPrefix: rawKey.slice(0, 12),
    keyHash: hashApiKey(rawKey),
    scopes: input.apiKeyScopes,
    createdByUserId: asObjectId(input.createdByUserId)
  });

  return {
    tenant: serializeSupportApiTenant(tenant),
    apiKey: serializeSupportApiKey(apiKey),
    secret: rawKey,
    webhookSigningSecret
  };
}

export async function listSupportApiTenants() {
  const tenants = await SupportTenant.find({}).sort({ createdAt: -1 }).limit(100);
  return tenants.map(serializeSupportApiTenant);
}

export function serializeSupportApiTenant(tenant: SupportTenantDocument) {
  return {
    id: String(tenant._id),
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    webhookUrl: tenant.webhookUrl || "",
    allowedOrigins: tenant.allowedOrigins || [],
    rateLimitPerMinute: tenant.rateLimitPerMinute || 120,
    monthlyUsageLimit: tenant.monthlyUsageLimit ?? 10000,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString()
  };
}

export function serializeSupportApiKey(apiKey: SupportApiKeyDocument) {
  return {
    id: String(apiKey._id),
    tenantId: String(apiKey.tenantId),
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes || [],
    status: apiKey.status,
    lastUsedAt: dateOrNull(apiKey.lastUsedAt),
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString()
  };
}

function serializeExternalCustomer(customer: ExternalSupportCustomerDocument) {
  return {
    id: String(customer._id),
    externalId: customer.externalId,
    name: customer.name || "",
    email: customer.email || "",
    metadata: customer.metadata || {}
  };
}

function populatedCustomer(value: unknown) {
  if (value && typeof value === "object" && "_id" in value) return serializeExternalCustomer(value as ExternalSupportCustomerDocument);
  return null;
}

export function serializeExternalConversation(conversation: ExternalSupportConversationDocument) {
  return {
    id: String(conversation._id),
    tenantId: String(conversation.tenantId),
    customer: populatedCustomer(conversation.customerId),
    customerId: String(conversation.customerId),
    externalConversationId: conversation.externalConversationId || "",
    status: conversation.status,
    subject: conversation.subject || "",
    latestMessagePreview: conversation.latestMessagePreview || "",
    lastMessageAt: dateOrNull(conversation.lastMessageAt),
    customerUnreadCount: conversation.customerUnreadCount || 0,
    agentUnreadCount: conversation.agentUnreadCount || 0,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

export function serializeExternalMessage(message: ExternalSupportMessageDocument) {
  return {
    id: String(message._id),
    conversationId: String(message.conversationId),
    senderType: message.senderType,
    senderName: message.senderName || "",
    body: message.body || "",
    readAt: dateOrNull(message.readAt),
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString()
  };
}

async function upsertExternalCustomer(input: {
  tenantId: Types.ObjectId;
  externalId: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}) {
  const update = {
    $set: {
      name: compactText(input.name || "", 160),
      email: compactText(input.email || "", 254).toLowerCase(),
      metadata: input.metadata || {}
    },
    $setOnInsert: {
      tenantId: input.tenantId,
      externalId: compactText(input.externalId, 160)
    }
  };

  return ExternalSupportCustomer.findOneAndUpdate(
    { tenantId: input.tenantId, externalId: compactText(input.externalId, 160) },
    update,
    { new: true, upsert: true }
  ).orFail();
}

export async function createExternalSupportConversation(input: {
  tenantId: string;
  customer: { externalId: string; name?: string; email?: string; metadata?: Record<string, unknown> };
  externalConversationId?: string;
  subject?: string;
  initialMessage?: string;
  idempotencyKey?: string;
}) {
  const tenantId = asObjectId(input.tenantId);
  const customer = await upsertExternalCustomer({ tenantId, ...input.customer });
  const externalConversationId = compactText(input.externalConversationId || "", 160);
  let conversation: ExternalSupportConversationDocument | null = null;

  if (externalConversationId) {
    conversation = await ExternalSupportConversation.findOne({ tenantId, externalConversationId }).populate("customerId");
  }

  if (!conversation) {
    conversation = await ExternalSupportConversation.findOne({
      tenantId,
      customerId: customer._id,
      status: { $in: ["open", "pending"] }
    })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate("customerId");
  }

  if (!conversation) {
    const createdConversation = await ExternalSupportConversation.create({
      tenantId,
      customerId: customer._id,
      externalConversationId,
      subject: compactText(input.subject || "", 180),
      status: "open"
    });
    conversation = await ExternalSupportConversation.findById(createdConversation._id).populate("customerId").orFail();
    await enqueueSupportWebhookEvent({
      tenantId: String(tenantId),
      eventType: "conversation.created",
      payload: { conversation: serializeExternalConversation(conversation) }
    });
  }

  let message: ReturnType<typeof serializeExternalMessage> | null = null;
  if (input.initialMessage?.trim()) {
    message = await createExternalSupportMessage({
      tenantId: String(tenantId),
      conversationId: String(conversation._id),
      senderType: "customer",
      senderName: customer.name || "Customer",
      body: input.initialMessage,
      idempotencyKey: input.idempotencyKey
    });
    conversation = await ExternalSupportConversation.findById(conversation._id).populate("customerId").orFail();
  }

  return { conversation: serializeExternalConversation(conversation), message };
}

export async function listExternalSupportConversations(input: {
  tenantId: string;
  status?: "all" | "open" | "pending" | "resolved";
  customerExternalId?: string;
  limit?: number;
}) {
  const tenantId = asObjectId(input.tenantId);
  const query: Record<string, unknown> = { tenantId };
  if (input.status && input.status !== "all") query.status = input.status;
  if (input.customerExternalId) {
    const customer = await ExternalSupportCustomer.findOne({ tenantId, externalId: compactText(input.customerExternalId, 160) }).select("_id");
    if (!customer) return [];
    query.customerId = customer._id;
  }

  const conversations = await ExternalSupportConversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(Math.min(Math.max(input.limit || 50, 1), 100))
    .populate("customerId");

  return conversations.map(serializeExternalConversation);
}

export async function listAdminExternalSupportConversations(input: {
  tenantId?: string;
  status?: "all" | "open" | "pending" | "resolved";
  customerExternalId?: string;
  limit?: number;
}) {
  const query: Record<string, unknown> = {};
  if (input.tenantId) query.tenantId = asObjectId(input.tenantId);
  if (input.status && input.status !== "all") query.status = input.status;
  if (input.customerExternalId) {
    const customerQuery: Record<string, unknown> = { externalId: compactText(input.customerExternalId, 160) };
    if (input.tenantId) customerQuery.tenantId = asObjectId(input.tenantId);
    const customers = await ExternalSupportCustomer.find(customerQuery).select("_id").limit(100);
    if (!customers.length) return [];
    query.customerId = { $in: customers.map((customer) => customer._id) };
  }

  const conversations = await ExternalSupportConversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(Math.min(Math.max(input.limit || 50, 1), 100))
    .populate("customerId");

  return conversations.map(serializeExternalConversation);
}

export async function getExternalSupportConversation(input: { tenantId: string; conversationId: string }) {
  const conversation = await ExternalSupportConversation.findOne({
    _id: asObjectId(input.conversationId),
    tenantId: asObjectId(input.tenantId)
  }).populate("customerId");
  return conversation ? serializeExternalConversation(conversation) : null;
}

export async function getAdminExternalSupportConversation(input: { conversationId: string }) {
  const conversation = await ExternalSupportConversation.findById(asObjectId(input.conversationId)).populate("customerId");
  return conversation ? serializeExternalConversation(conversation) : null;
}

export async function listExternalSupportMessages(input: { tenantId: string; conversationId: string; cursor?: string; limit?: number }) {
  const tenantId = asObjectId(input.tenantId);
  const conversation = await ExternalSupportConversation.findOne({ _id: asObjectId(input.conversationId), tenantId }).select("_id");
  if (!conversation) throw new Error("external_support_conversation_not_found");

  const query: Record<string, unknown> = { tenantId, conversationId: conversation._id };
  if (input.cursor) query._id = { $lt: asObjectId(input.cursor) };
  const limit = Math.min(Math.max(input.limit || 50, 1), 100);
  const messages = await ExternalSupportMessage.find(query).sort({ _id: -1 }).limit(limit + 1);
  const hasMore = messages.length > limit;
  const page = (hasMore ? messages.slice(0, limit) : messages).reverse();
  return { messages: page.map(serializeExternalMessage), nextCursor: hasMore ? String(messages[limit - 1]._id) : null };
}

export async function createExternalSupportMessage(input: {
  tenantId: string;
  conversationId: string;
  senderType: "customer" | "agent" | "system";
  senderName?: string;
  body: string;
  idempotencyKey?: string;
}) {
  const tenantId = asObjectId(input.tenantId);
  const conversation = await ExternalSupportConversation.findOne({ _id: asObjectId(input.conversationId), tenantId });
  if (!conversation) throw new Error("external_support_conversation_not_found");

  const body = compactText(input.body, 4000);
  const preview = compactText(body, 180);
  const idempotencyKey = compactText(input.idempotencyKey || "", 100);
  let message: ExternalSupportMessageDocument | null = null;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      try {
        const [created] = await ExternalSupportMessage.create(
          [
            {
              tenantId,
              conversationId: conversation._id,
              senderType: input.senderType,
              senderName: compactText(input.senderName || "", 160),
              body,
              idempotencyKey
            }
          ],
          { session }
        );
        message = created;
      } catch (error) {
        if (idempotencyKey && error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
          message = await ExternalSupportMessage.findOne({ tenantId, conversationId: conversation._id, senderType: input.senderType, idempotencyKey })
            .session(session)
            .orFail();
          return;
        }
        throw error;
      }

      await ExternalSupportConversation.updateOne(
        { _id: conversation._id, tenantId },
        {
          $set: { lastMessageAt: new Date(), latestMessagePreview: preview, status: conversation.status === "resolved" ? "open" : conversation.status },
          $inc: input.senderType === "customer" ? { agentUnreadCount: 1 } : { customerUnreadCount: 1 }
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  if (!message) throw new Error("external_support_message_not_persisted");
  const serializedMessage = serializeExternalMessage(message);
  const updatedConversation = await ExternalSupportConversation.findById(conversation._id).populate("customerId");
  await enqueueSupportWebhookEvent({
    tenantId: String(tenantId),
    eventType: "message.created",
    payload: {
      conversation: updatedConversation ? serializeExternalConversation(updatedConversation) : null,
      message: serializedMessage
    }
  });
  return serializedMessage;
}

export async function createAdminExternalSupportMessage(input: {
  conversationId: string;
  senderName: string;
  body: string;
  idempotencyKey?: string;
}) {
  const conversation = await ExternalSupportConversation.findById(asObjectId(input.conversationId)).select("tenantId");
  if (!conversation) throw new Error("external_support_conversation_not_found");
  return createExternalSupportMessage({
    tenantId: String(conversation.tenantId),
    conversationId: input.conversationId,
    senderType: "agent",
    senderName: input.senderName,
    body: input.body,
    idempotencyKey: input.idempotencyKey
  });
}

export async function updateAdminExternalSupportConversationStatus(input: {
  conversationId: string;
  status: "open" | "pending" | "resolved";
}) {
  const conversation = await ExternalSupportConversation.findByIdAndUpdate(
    asObjectId(input.conversationId),
    { $set: { status: input.status } },
    { new: true }
  ).populate("customerId");
  if (!conversation) throw new Error("external_support_conversation_not_found");
  const serializedConversation = serializeExternalConversation(conversation);
  await enqueueSupportWebhookEvent({
    tenantId: String(conversation.tenantId),
    eventType: "conversation.updated",
    payload: { conversation: serializedConversation }
  });
  return serializedConversation;
}
