import { z } from "zod";

export const checkoutSchema = z.object({
  plan: z.enum(["plus_monthly", "plus_yearly"])
});
