import type { NextRequest, NextResponse } from "next/server";

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || "fitpick_session";
}

export function requestUsesHttps(request: NextRequest) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
  );
}

function readBooleanEnv(value?: string) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

export function sessionCookieIsSecure(request: NextRequest) {
  const explicit = readBooleanEnv(process.env.SESSION_COOKIE_SECURE);
  if (explicit !== null) return explicit;

  return requestUsesHttps(request);
}

export function setSessionCookie(response: NextResponse, request: NextRequest, token: string) {
  response.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: sessionCookieIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSessionCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    secure: sessionCookieIsSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
