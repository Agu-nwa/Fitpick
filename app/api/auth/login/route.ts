export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/cookies";
import { connectDB } from "@/lib/db";
import { createSessionToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { readJson, validateBody } from "@/lib/validation";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { loginSchema } from "@/schemas/auth.schema";
import { toSafeUser, User } from "@/models/User";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `auth-login:${meta.ip}`, limit: 20, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  try {
    const body = await readJson(request);
    const parsed = validateBody(loginSchema, body);
    if (!parsed.ok) return parsed.response;

    await connectDB();

    const email = parsed.data.email.toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      return apiError("UNAUTHORIZED", "Invalid email or password.");
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!validPassword) {
      return apiError("UNAUTHORIZED", "Invalid email or password.");
    }

    user.lastLoginAt = new Date();
    await user.save();

    await recordAuditEvent({
      request,
      userId: String(user._id),
      action: "auth.login",
      entityType: "User",
      entityId: String(user._id)
    });

    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      role: user.role
    });

    const response = apiSuccess({ user: toSafeUser(user) }, { message: "Signed in." });
    setSessionCookie(response, request, token);
    return response;
  } catch (error) {
    console.error("FitPick login error:", error);
    return apiError("INTERNAL_ERROR", "Unable to sign in right now.");
  }
}
