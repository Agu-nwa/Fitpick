import { z } from "zod";
import { getSupportMessageMaxLength } from "@/lib/support/config";

const objectIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, "Invalid conversation reference.");

export const supportConversationIdSchema = z.object({ id: objectIdSchema });

export const supportAttachmentSchema = z.object({
  key: z.string().trim().min(1).max(500),
  url: z.string().trim().url().max(1000),
  filename: z.string().trim().min(1).max(160),
  mimeType: z.enum(["image/jpeg", "image/webp"]),
  size: z.number().int().positive().max(50 * 1024 * 1024),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000)
});

export const supportMessageBodySchema = z
  .object({
    body: z.string().optional().default(""),
    attachments: z.array(supportAttachmentSchema).max(4).optional().default([]),
    idempotencyKey: z.string().trim().min(8).max(100).optional()
  })
  .superRefine((value, ctx) => {
    const body = value.body.trim();
    if (body.length > getSupportMessageMaxLength()) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: getSupportMessageMaxLength(),
        type: "string",
        inclusive: true,
        path: ["body"],
        message: "Keep your message a little shorter."
      });
    }
    if (!body && value.attachments.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Write a message or attach an image." });
    }
  });

export const supportStatusPatchSchema = z.object({ status: z.enum(["open", "pending", "resolved"]) });
export const supportAssignmentPatchSchema = z.object({ assignedAgentId: objectIdSchema.nullable().optional() });
export const supportInternalNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, "Write a little more detail.")
    .max(2000, "Keep internal notes under 2,000 characters.")
});
export const adminSupportListQuerySchema = z.object({
  status: z.enum(["all", "open", "pending", "resolved"]).optional().default("all"),
  unread: z.enum(["all", "support"]).optional().default("all"),
  search: z.string().trim().max(80).optional().default("")
});
export const supportSocketJoinSchema = z.object({ conversationId: objectIdSchema.optional() });
export const supportSocketTypingSchema = z.object({ conversationId: objectIdSchema, isTyping: z.boolean().optional().default(true) });
export const supportSocketReadSchema = z.object({ conversationId: objectIdSchema });
