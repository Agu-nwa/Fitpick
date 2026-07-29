export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { createSupportApiTenant, listSupportApiTenants } from "@/lib/support-api/support-api-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportApiTenantCreateSchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-tenants-get:${meta.ip}`, limit: 80, windowMs: 60_000, operation: "admin-support-api-tenants-get" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    await connectDB();
    const tenants = await listSupportApiTenants();
    return apiSuccess({ tenants });
  } catch (error) {
    logSafeError("admin.support-api.tenants.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load support API tenants right now.");
  }
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-tenants-post:${meta.ip}`, limit: 10, windowMs: 60_000, operation: "admin-support-api-tenants-post" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(supportApiTenantCreateSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    await connectDB();
    const result = await createSupportApiTenant({ ...parsed.data, createdByUserId: String(auth.user._id) });
    return apiSuccess(result, { message: "Support API tenant created. Store the API key securely; it will not be shown again.", status: 201 });
  } catch (error) {
    logSafeError("admin.support-api.tenants.post", error);
    if (error && typeof error === "object" && "code" in error && (error as { code?: number }).code === 11000) {
      return apiError("CONFLICT", "A support API tenant or key already exists with those details.");
    }
    return apiError("INTERNAL_ERROR", "Unable to create support API tenant right now.");
  }
}
