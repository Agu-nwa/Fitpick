import { jwtVerify, SignJWT } from "jose";
import { sessionCookieName } from "@/lib/cookies";
import { connectDB } from "@/lib/db";
import { verifySessionToken } from "@/lib/jwt";
import { getSupportSocketSecret } from "@/lib/support/config";
import { User, type UserDocument } from "@/models/User";

export type SupportSocketActor = {
  userId: string;
  email: string;
  role: "user" | "admin";
  sessionId?: string;
};

function parseCookieHeader(cookieHeader?: string | null) {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;
  for (const chunk of cookieHeader.split(";")) {
    const [name, ...rest] = chunk.trim().split("=");
    if (!name || rest.length === 0) continue;
    cookies.set(name, decodeURIComponent(rest.join("=")));
  }
  return cookies;
}

async function assertActiveUser(actor: SupportSocketActor): Promise<{ actor: SupportSocketActor; user: UserDocument }> {
  await connectDB();
  const user = await User.findById(actor.userId).select("+activeSessionId");
  if (!user) throw new Error("support_socket_unauthorized");
  if (!actor.sessionId || !user.activeSessionId || user.activeSessionId !== actor.sessionId) {
    throw new Error("support_socket_unauthorized");
  }
  return { actor: { ...actor, role: user.role }, user };
}

export async function createSupportSocketToken(actor: SupportSocketActor) {
  return new SignJWT({
    userId: actor.userId,
    email: actor.email,
    role: actor.role,
    sessionId: actor.sessionId,
    scope: "fitpick:support-socket"
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSupportSocketSecret());
}

export async function verifySupportSocketToken(token: string): Promise<SupportSocketActor | null> {
  try {
    const verified = await jwtVerify(token, getSupportSocketSecret());
    const payload = verified.payload;
    if (
      payload.scope !== "fitpick:support-socket" ||
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined
    };
  } catch {
    return null;
  }
}

export async function authenticateSupportSocket(input: { token?: string; cookieHeader?: string | null }) {
  const tokenActor = input.token ? await verifySupportSocketToken(input.token) : null;
  if (tokenActor) return assertActiveUser(tokenActor);

  const sessionToken = parseCookieHeader(input.cookieHeader).get(sessionCookieName());
  const session = sessionToken ? await verifySessionToken(sessionToken) : null;
  if (!session) throw new Error("support_socket_unauthorized");

  return assertActiveUser({
    userId: session.userId,
    email: session.email,
    role: session.role,
    sessionId: session.sessionId
  });
}
