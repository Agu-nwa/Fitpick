"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, type CurrentUserSummary } from "@/lib/api-client";

export type SessionState = {
  status: "loading" | "authenticated" | "logged-out" | "backend-unavailable";
  user?: CurrentUserSummary["user"];
  message?: string;
  refresh: () => Promise<void>;
};

export function useSession(): SessionState {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [user, setUser] = useState<CurrentUserSummary["user"]>();
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus("loading");
    const result = await getCurrentUser();

    if (result.ok) {
      setUser(result.data.user);
      setStatus(result.data.user ? "authenticated" : "logged-out");
      setMessage(undefined);
      return;
    }

    setUser(undefined);
    setMessage(result.error.message);
    setStatus(result.error.code === "UNAUTHORIZED" ? "logged-out" : "backend-unavailable");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status !== "logged-out" || !isProtectedClientPath(pathname)) return;

    const query = window.location.search.replace(/^\?/, "");
    const next = `${pathname}${query ? `?${query}` : ""}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [pathname, router, status]);

  return { status, user, message, refresh };
}

const protectedClientPrefixes = [
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

function isProtectedClientPath(pathname: string | null) {
  if (!pathname) return false;
  return protectedClientPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
