"use client";

import { createContext, useContext } from "react";
import type { CurrentUserSummary } from "@/lib/api-client";

export type SessionState = {
  status: "loading" | "authenticated" | "logged-out" | "backend-unavailable";
  user?: CurrentUserSummary["user"];
  message?: string;
  refresh: () => Promise<void>;
};

export const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used within SessionProvider.");
  return session;
}
