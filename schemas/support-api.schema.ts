import { z } from "zod";

const objectIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, "Invalid reference.");

const metadataSchema = z
  .record(z.string(), z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
  .optional()
  .default({});

export const supportApiScopeSchema = z.enum(["conversations:read", "conversations:write", "messages:read", "messages:write", "webhooks:read"]);

export const supportApiTenantCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.")
    .min(2)
    .max(80),
  apiKeyName: z.string().trim().min(2).max(120).optional().default("Default API key"),
  webhookUrl: z.string().trim().url().max(500).optional().or(z.literal("")).default(""),
  allowedOrigins: z.array(z.string().trim().max(240)).max(20).optional().default([]),
  rateLimitPerMinute: z.number().int().min(1).max(5000).optional().default(120),
  monthlyUsageLimit: z.number().int().min(0).max(10_000_000).optional().default(10_000),
  apiKeyScopes: z.array(supportApiScopeSchema).min(1).max(10).optional().default(["conversations:read", "conversations:write", "messages:read", "messages:write"])
});

export const supportApiConversationCreateSchema = z.object({
  customer: z.object({
    externalId: z.string().trim().min(1).max(160),
    name: z.string().trim().max(160).optional().default(""),
    email: z.string().trim().email().max(254).optional().or(z.literal("")).default(""),
    metadata: metadataSchema
  }),
  externalConversationId: z.string().trim().max(160).optional().default(""),
  subject: z.string().trim().max(180).optional().default(""),
  initialMessage: z.string().trim().max(4000).optional().default(""),
  idempotencyKey: z.string().trim().min(8).max(100).optional()
});

export const supportApiConversationListQuerySchema = z.object({
  status: z.enum(["all", "open", "pending", "resolved"]).optional().default("all"),
  customerExternalId: z.string().trim().max(160).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export const supportApiConversationIdSchema = z.object({ id: objectIdSchema });

export const supportApiMessageCreateSchema = z
  .object({
    body: z.string().trim().max(4000).optional().default(""),
    senderName: z.string().trim().max(160).optional().default(""),
    idempotencyKey: z.string().trim().min(8).max(100).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.body.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Write a message." });
    }
  });

export const supportApiMessageListQuerySchema = z.object({
  cursor: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export const adminSupportApiConversationListQuerySchema = z.object({
  tenantId: objectIdSchema.optional(),
  status: z.enum(["all", "open", "pending", "resolved"]).optional().default("open"),
  customerExternalId: z.string().trim().max(160).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export const adminSupportApiStatusPatchSchema = z.object({ status: z.enum(["open", "pending", "resolved"]) });

export const adminSupportApiWebhookListQuerySchema = z.object({
  tenantId: objectIdSchema.optional(),
  status: z.enum(["all", "queued", "delivered", "failed", "dead_letter"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export const supportApiWebhookEventIdSchema = z.object({ id: objectIdSchema });

export const adminSupportApiUsageQuerySchema = z.object({
  tenantId: objectIdSchema.optional(),
  operation: z.string().trim().max(120).optional().default(""),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100)
});
