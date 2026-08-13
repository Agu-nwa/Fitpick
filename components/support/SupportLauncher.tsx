"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { SupportConversationSummary } from "@/types/support";

type SupportLauncherData = {
  conversation: SupportConversationSummary | null;
  config: { enabled: boolean };
};

export function SupportLauncher() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/support/conversation", { credentials: "include", cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<SupportLauncherData>;
        if (!cancelled && payload.ok) {
          setEnabled(Boolean(payload.data.config.enabled));
          setUnread(payload.data.conversation?.userUnreadCount || 0);
        }
      } catch {
        if (!cancelled) setEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!enabled || pathname === "/support" || pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/support"
      className="focus-ring fixed bottom-[calc(6.4rem+var(--safe-bottom))] right-4 z-30 inline-flex size-12 items-center justify-center rounded-full border border-line bg-surfaceWarm text-ink shadow-card transition hover:border-cocoa/40 hover:text-cocoa lg:bottom-6 lg:right-6 lg:w-auto lg:px-4"
      aria-label={unread ? `Chat with Support, ${unread} unread` : "Chat with Support"}
    >
      <MessageCircle size={17} aria-hidden="true" />
      <span className="hidden sm:inline">Support</span>
      {unread ? <span className="grid size-5 place-items-center rounded-full bg-cocoa text-[10px] text-canvas">{Math.min(unread, 9)}</span> : null}
    </Link>
  );
}
