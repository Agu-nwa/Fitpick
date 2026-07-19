export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { listUserPurchases } from "@/lib/payments/purchases";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({
    key: `payment-purchases:${meta.ip}`,
    limit: 60,
    windowMs: 60 * 1000,
    operation: "payment-purchases"
  });
  if (limited) return limited;

  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const purchases = await listUserPurchases(auth.user._id);
  return apiSuccess({ purchases });
}
