export const dynamic = "force-dynamic";

import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { setSessionCookie } from "@/lib/cookies";
import { connectDB } from "@/lib/db";
import { createActiveSessionId, createSessionToken } from "@/lib/jwt";
import { normalizeEmail, verifyEmailOtp } from "@/lib/otp";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { NotificationPreference } from "@/models/NotificationPreference";
import { StylePreference } from "@/models/StylePreference";
import { toSafeUser, User } from "@/models/User";
import { verifyOtpSchema } from "@/schemas/auth.schema";

function defaultNameFromEmail(email: string) {
  const local = email.split("@")[0] || "MyFitPick";
  const cleaned = local.replace(/[._-]+/g, " ").replace(/[^a-z0-9 ]/gi, "").trim();
  if (!cleaned) return "MyFitPick User";
  return cleaned
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 80);
}

function otpFailureMessage(reason: string) {
  if (reason === "expired") return "This code has expired. Request a new code.";
  if (reason === "attempts") return "Too many incorrect attempts. Request a new code.";
  return "Invalid code. Check the code and try again.";
}

async function ensureUserDefaults(userId: mongoose.Types.ObjectId) {
  await Promise.all([
    StylePreference.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true }),
    NotificationPreference.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true })
  ]);
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `auth-verify-otp:${meta.ip}`, limit: 20, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  try {
    const parsed = validateBody(verifyOtpSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    await connectDB();

    const email = normalizeEmail(parsed.data.email);
    const purpose = parsed.data.purpose;
    const otp = await verifyEmailOtp({ email, purpose, code: parsed.data.code });

    if (!otp.ok) {
      return apiError("UNAUTHORIZED", otpFailureMessage(otp.reason));
    }

    let user = await User.findOne({ email });

    if (purpose === "signin") {
      if (!user) {
        return apiError("NOT_FOUND", "No account found. Create an account first.");
      }
    } else if (!user) {
      try {
        user = await User.create({
          name: parsed.data.name || defaultNameFromEmail(email),
          email,
          passwordHash: "",
          role: "user",
          credits: 20,
          totalCreditsPurchased: 0,
          totalCreditsRefunded: 0,
          totalCreditsSpent: 0,
          complimentaryCreditsUsed: 0
        });
        await ensureUserDefaults(user._id);
      } catch (error: any) {
        if (error?.code === 11000) {
          user = await User.findOne({ email });
        } else {
          throw error;
        }
      }
    }

    if (!user) {
      return apiError("CONFLICT", "Account already exists. Sign in instead.");
    }

    const activeSessionId = createActiveSessionId();
    user.activeSessionId = activeSessionId;
    user.activeSessionIssuedAt = new Date();
    user.lastLoginAt = new Date();
    await user.save();

    await recordAuditEvent({
      request,
      userId: String(user._id),
      action: purpose === "signup" ? "auth.otp.signup.verify" : "auth.otp.signin.verify",
      entityType: "User",
      entityId: String(user._id)
    });

    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
      sessionId: activeSessionId
    });

    const response = apiSuccess(
      {
        user: toSafeUser(user)
      },
      { message: purpose === "signup" ? "Account created." : "Signed in.", status: purpose === "signup" ? 201 : 200 }
    );
    setSessionCookie(response, request, token);
    return response;
  } catch (error) {
    logSafeError("auth.verify-otp", error);
    return apiError("INTERNAL_ERROR", "Unable to verify this code right now.");
  }
}
