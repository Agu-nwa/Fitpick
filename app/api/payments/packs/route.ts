export const dynamic = "force-dynamic";

import { apiSuccess } from "@/lib/api-response";
import { serializeCreditPacks } from "@/lib/payments/packs";

export async function GET() {
  return apiSuccess({ packs: serializeCreditPacks() });
}
