"use client";

import { useCallback, useEffect, useState } from "react";
import { getBackendHealth, type BackendHealth } from "@/lib/api-client";

export function useBackendHealth() {
  const [status, setStatus] = useState<"loading" | "reachable" | "setup-needed" | "unavailable">("loading");
  const [health, setHealth] = useState<BackendHealth>();
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setStatus("loading");
    const result = await getBackendHealth();

    if (result.ok) {
      setHealth(result.data);
      setMessage(undefined);
      setStatus(result.data.databaseConfigured ? "reachable" : "setup-needed");
      return;
    }

    setHealth(undefined);
    setMessage(result.error.message);
    setStatus("unavailable");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, health, message, refresh };
}
