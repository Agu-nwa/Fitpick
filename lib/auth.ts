import { cookies } from "next/headers";
import { apiError } from "@/lib/api-response";
import { sessionCookieName } from "@/lib/cookies";
import { connectDB } from "@/lib/db";
import { verifySessionToken } from "@/lib/jwt";
import { User } from "@/models/User";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUser() {
  const session = await getSessionUser();

  if (!session) {
    return {
      ok: false as const,
      response: apiError("UNAUTHORIZED", "Please sign in to continue.")
    };
  }

  await connectDB();
  const user = await User.findById(session.userId);

  if (!user) {
    return {
      ok: false as const,
      response: apiError("UNAUTHORIZED", "Please sign in to continue.")
    };
  }

  return { ok: true as const, session, user };
}
