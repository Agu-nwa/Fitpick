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

export function setSessionCookie(response: NextResponse, request: NextRequest, token: string) {
  response.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : requestUsesHttps(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSessionCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : requestUsesHttps(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}
