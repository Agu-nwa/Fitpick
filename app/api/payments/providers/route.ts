export const dynamic = "force-dynamic";

import { apiSuccess } from "@/lib/api-response";
import { paymentOverview } from "@/lib/payments";

export async function GET() {
  return apiSuccess(paymentOverview());
}
