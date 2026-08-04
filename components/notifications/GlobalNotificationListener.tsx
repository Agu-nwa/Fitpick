"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, X } from "lucide-react";
import { getAppNotifications, markAppNotificationRead, type AppNotificationSummary } from "@/lib/api-client";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

const POLL_MS = 15_000;

function isActionableTryOnNotification(notification: AppNotificationSummary) {
  return (
    !notification.readAt &&
    (notification.type === "virtual_tryon_ready" || notification.type === "virtual_tryon_failed")
  );
}

export default function GlobalNotificationListener() {
  const session = useSession();
  const [notification, setNotification] = useState<AppNotificationSummary | null>(null);
  const [visible, setVisible] = useState(false);
  const announcedIds = useRef<Set<string>>(new Set());
  const pollingRef = useRef<number | null>(null);

  const tone = useMemo(() => {
    if (notification?.type === "virtual_tryon_failed") return "border-[#E8B7AC] bg-[#FFF7F4] text-[#4A2E22]";
    return "border-[#D8B98C] bg-[#FFFCF5] text-[#171514]";
  }, [notification?.type]);

  useEffect(() => {
    if (session.status !== "authenticated") return;

    let cancelled = false;

    async function poll() {
      const result = await getAppNotifications();
      if (cancelled) return;
      if (!result.ok) {
        if (result.error.code === "UNAUTHORIZED") {
          cancelled = true;
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
        return;
      }

      const next = result.data.notifications.find(isActionableTryOnNotification);
      if (!next || announcedIds.current.has(next.id)) return;

      announcedIds.current.add(next.id);
      setNotification(next);
      setVisible(true);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        try {
          new window.Notification(next.title, { body: next.body || "Open MyFitPick to view the update." });
        } catch {
          // Browser notifications are an optional companion to the in-app toast.
        }
      }
    }

    void poll();
    pollingRef.current = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [session.status]);

  async function openNotification() {
    if (!notification) return;
    setVisible(false);
    await markAppNotificationRead(notification.id);
    if (notification.actionUrl) window.location.assign(notification.actionUrl);
  }

  async function dismissNotification() {
    if (!notification) return;
    setVisible(false);
    await markAppNotificationRead(notification.id);
  }

  if (!notification || !visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md md:bottom-6 md:right-6 md:left-auto">
      <div className={cn("rounded-[28px] border p-4 shadow-[0_24px_70px_rgba(23,21,20,0.16)] backdrop-blur-xl", tone)}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#557C78] text-white">
            {notification.type === "virtual_tryon_ready" ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{notification.title}</p>
            {notification.body ? <p className="mt-1 text-sm leading-5 text-muted">{notification.body}</p> : null}
            <button
              type="button"
              onClick={openNotification}
              className="mt-3 rounded-full bg-[#557C78] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A6F6B] focus:outline-none focus:ring-2 focus:ring-[#557C78]/30"
            >
              {notification.actionLabel || "Open"}
            </button>
          </div>
          <button
            type="button"
            onClick={dismissNotification}
            aria-label="Dismiss notification"
            className="rounded-full p-2 text-muted transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-[#557C78]/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
