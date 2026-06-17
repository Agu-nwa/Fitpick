export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { setSessionCookie } from "@/lib/cookies";
import { connectDB } from "@/lib/db";
import { createSessionToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { readJson, validateBody } from "@/lib/validation";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { NotificationPreference } from "@/models/NotificationPreference";
import { PlusSubscription } from "@/models/PlusSubscription";
import { StylePreference } from "@/models/StylePreference";
import { toSafeUser, User } from "@/models/User";
import { registerSchema } from "@/schemas/auth.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `auth-register:${meta.ip}`, limit: 8, windowMs: 60 * 60 * 1000 });
  if (limited) return limited;

  try {
    const body = await readJson(request);
    const parsed = validateBody(registerSchema, body);
    if (!parsed.ok) return parsed.response;

    await connectDB();

    const email = parsed.data.email.toLowerCase();
    const existing = await User.findOne({ email }).select("_id");

    if (existing) {
      return apiError("CONFLICT", "An account already exists for this email.");
    }

    const user = await User.create({
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: "user",
      plan: "free"
    });

    await Promise.all([
      StylePreference.create({ userId: user._id }),
      NotificationPreference.create({ userId: user._id }),
      PlusSubscription.create({ userId: user._id }),
      recordAuditEvent({ request, userId: String(user._id), action: "auth.register", entityType: "User", entityId: String(user._id) })
    ]);

    const token = await createSessionToken({
      userId: String(user._id),
      email: user.email,
      role: user.role
    });

    const response = apiSuccess({ user: toSafeUser(user) }, { message: "Account created.", status: 201 });
    setSessionCookie(response, request, token);
    return response;
  } catch (error) {
    console.error("FitPick register error:", error);
    return apiError("INTERNAL_ERROR", "Unable to create your account right now.");
  }
}
