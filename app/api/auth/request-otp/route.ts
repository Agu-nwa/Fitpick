export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { connectDB } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email/resend";
import { consumeOtpById, createEmailOtp, normalizeEmail } from "@/lib/otp";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { User } from "@/models/User";
import { requestOtpSchema } from "@/schemas/auth.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `auth-request-otp:${meta.ip}`, limit: 10, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  try {
    const parsed = validateBody(requestOtpSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    await connectDB();

    const email = normalizeEmail(parsed.data.email);
    const purpose = parsed.data.purpose;
    const existing = await User.findOne({ email }).select("_id").lean();

    if (purpose === "signup" && existing) {
      return apiError("CONFLICT", "Account already exists. Sign in instead.");
    }

    if (purpose === "signin" && !existing) {
      return apiError("NOT_FOUND", "No account found. Create an account first.");
    }

    const otp = await createEmailOtp({
      email,
      purpose,
      requestedIp: meta.ip,
      userAgent: request.headers.get("user-agent") || ""
    });

    try {
      await sendOtpEmail({
        to: email,
        code: otp.code,
        purpose,
        expiresInMinutes: otp.expiresInMinutes
      });
    } catch (error) {
      await consumeOtpById(otp.id);
      throw error;
    }

    await recordAuditEvent({
      request,
      userId: existing ? String(existing._id) : undefined,
      action: purpose === "signup" ? "auth.otp.signup.request" : "auth.otp.signin.request",
      entityType: "EmailOtp",
      entityId: existing ? String(existing._id) : undefined
    });

    return apiSuccess(
      {
        email,
        purpose,
        expiresAt: otp.expiresAt.toISOString(),
        expiresInMinutes: otp.expiresInMinutes
      },
      { message: "We sent a verification code to your email." }
    );
  } catch (error) {
    logSafeError("auth.request-otp", error);
    return apiError("INTERNAL_ERROR", "Unable to send a verification code right now.");
  }
}
