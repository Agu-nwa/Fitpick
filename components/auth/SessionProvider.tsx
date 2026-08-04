"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, type CurrentUserSummary } from "@/lib/api-client";
import { SessionContext, type SessionState } from "@/hooks/use-session";
import { safeUserMessage } from "@/lib/user-facing-errors";

const protectedClientPrefixes = [
  "/admin",
  "/avatar",
  "/backend-ready",
  "/frontend-complete",
  "/home",
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

export function SessionProvider({ children }: { children: ReactNode }) {
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
    setMessage(safeUserMessage(result.error, "Please sign in again to continue."));
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

  const value = useMemo<SessionState>(() => ({ status, user, message, refresh }), [message, refresh, status, user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
