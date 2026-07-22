"use client";

import { useEffect } from "react";

const RECOVERY_KEY = "fitpick-chunk-recovery";

function isChunkError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed")
  );
}

export default function ClientRecovery() {
  useEffect(() => {
    const attemptRecovery = (message: string) => {
      if (!isChunkError(message)) return;

      const alreadyReloaded =
        sessionStorage.getItem(RECOVERY_KEY) === "true";

      if (alreadyReloaded) return;

      sessionStorage.setItem(RECOVERY_KEY, "true");
      window.location.reload();
    };

    const handleError = (event: ErrorEvent) => {
      attemptRecovery(
        event.message || String(event.error || "")
      );
    };

    const handlePromiseRejection = (
      event: PromiseRejectionEvent
    ) => {
      const message =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason || "");

      attemptRecovery(message);
    };

    window.addEventListener("error", handleError);
    window.addEventListener(
      "unhandledrejection",
      handlePromiseRejection
    );

    const clearFlag = window.setTimeout(() => {
      sessionStorage.removeItem(RECOVERY_KEY);
    }, 30_000);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handlePromiseRejection
      );
      window.clearTimeout(clearFlag);
    };
  }, []);

  return null;
}
