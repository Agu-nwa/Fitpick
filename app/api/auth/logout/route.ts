export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";
import { clearSessionCookie } from "@/lib/cookies";
import { getSessionUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export async function POST(request: NextRequest) {
  const session = await getSessionUser();

  if (session) {
    await connectDB();
    if (session.sessionId) {
      await User.updateOne(
        { _id: session.userId, activeSessionId: session.sessionId },
        { $set: { activeSessionId: "", activeSessionIssuedAt: null } }
      );
    }

    await recordAuditEvent({
      request,
      userId: session.userId,
      action: "auth.logout",
      entityType: "User",
      entityId: session.userId
    });
  }

  const response = apiSuccess({ signedOut: true }, { message: "Signed out." });
  clearSessionCookie(response, request);
  return response;
}
