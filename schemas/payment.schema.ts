import { z } from "zod";

export const checkoutProviderSchema = z.enum(["stripe", "paystack", "auto", "placeholder"]).default("auto");
export const billingPlanSchema = z.enum(["plus_monthly", "plus_yearly"]);
export const billingCurrencySchema = z.enum(["USD", "NGN"]).optional();

export const paymentCheckoutSchema = z.object({
  provider: checkoutProviderSchema.optional(),
  plan: billingPlanSchema,
  currency: billingCurrencySchema,
  successUrl: z.string().trim().url().max(500).optional(),
  cancelUrl: z.string().trim().url().max(500).optional()
});
