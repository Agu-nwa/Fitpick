"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, type CurrentUserSummary } from "@/lib/api-client";

export type SessionState = {
  status: "loading" | "authenticated" | "logged-out" | "backend-unavailable";
  user?: CurrentUserSummary["user"];
  message?: string;
  refresh: () => Promise<void>;
};

export function useSession(): SessionState {
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

  return { status, user, message, refresh };
}
