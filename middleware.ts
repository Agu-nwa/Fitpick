import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const protectedPagePrefixes = [
  "/admin",
  "/avatar",
  "/backend-ready",
  "/frontend-complete",
  "/home",
  "/looks",
  "/occasion",
  "/onboarding",
  "/outfit",
  "/plus",
  "/profile",
  "/states",
  "/style-profile",
  "/stylist",
  "/wallet",
  "/wardrobe"
];

const authPages = new Set(["/login", "/register"]);

function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME || "fitpick_session";
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const response = NextResponse.redirect(url);
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https",
    path: "/",
    maxAge: 0
  });
  return response;
}

async function hasValidSessionToken(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  const secret = jwtSecret();
  if (!token || !secret) return false;

  try {
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload;
    return (
      payload.scope === "fitpick:user" &&
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      (payload.role === "user" || payload.role === "admin")
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const destination = (await hasValidSessionToken(request)) ? "/home" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (authPages.has(pathname) && (await hasValidSessionToken(request))) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (isProtectedPage(pathname) && !(await hasValidSessionToken(request))) {
    return loginRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|assets|images).*)"]
};
