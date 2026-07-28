"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability should never block the app experience.
    });
  }, []);

  return null;
}
