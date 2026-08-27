export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { readJson, validateBody } from "@/lib/validation";
import { logSafeError } from "@/lib/security/safe-log";
import { PrivacyRequest } from "@/models/PrivacyRequest";

const schema = z.object({
  type: z.enum(["access", "correction", "objection", "deletion", "withdrawal"]),
  details: z.string().trim().max(2000).default("")
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const requests = await PrivacyRequest.find({ userId: auth.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  return apiSuccess({ requests });
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `privacy-request:${meta.ip}`, limit: 6, windowMs: 60 * 60 * 1000, operation: "privacy-request" });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(schema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    if (parsed.data.type === "deletion") {
      return apiError("BAD_REQUEST", "Use the dedicated account-deletion control so access can be disabled and progress tracked safely.");
    }
    const requestedAt = new Date();
    const retentionDays = Math.max(30, Math.min(Number(process.env.PRIVACY_REQUEST_RETENTION_DAYS || 730), 3650));
    const privacyRequest = await PrivacyRequest.create({
      userId: auth.user._id,
      type: parsed.data.type,
      details: parsed.data.details,
      policyVersion: process.env.PRIVACY_REQUEST_POLICY_VERSION || "privacy-requests-2026-08-26",
      requestedAt,
      expiresAt: new Date(requestedAt.getTime() + retentionDays * 86_400_000)
    });
    await recordAuditEvent({ request, userId: String(auth.user._id), action: `privacy.request.${parsed.data.type}`, entityType: "PrivacyRequest", entityId: String(privacyRequest._id) });
    return apiSuccess({ request: privacyRequest }, { status: 201, message: "Your privacy request has been recorded." });
  } catch (error) {
    logSafeError("privacy-request.create", error);
    return apiError("INTERNAL_ERROR", "Unable to record your privacy request right now.");
  }
}
