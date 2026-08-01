import { z } from "zod";

export const creditPackIdSchema = z.enum(["essential", "popular", "pro", "creator"]);

export const stripeCheckoutSchema = z.object({
  packId: creditPackIdSchema
}).strict();

export const purchaseIdParamSchema = z.object({
  purchaseId: z.string().trim().min(12).max(80)
});

export const adminRefundSchema = z.object({
  purchaseId: z.string().trim().min(12).max(80),
  amountMinor: z.number().int().min(1).optional(),
  reason: z.string().trim().min(3).max(240).optional()
}).strict();

export const adminReconcileSchema = z.object({
  purchaseId: z.string().trim().min(12).max(80)
}).strict();
