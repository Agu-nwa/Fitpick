export const dynamic = "force-dynamic";

import { apiError } from "@/lib/api-response";

export async function POST() {
  return apiError("BAD_REQUEST", "Use email code sign-up.");
}
