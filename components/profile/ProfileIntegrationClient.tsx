"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { PlusStatusCard } from "@/components/plus/PlusStatusClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import { getNotificationPreferences, getPlusStatus, updateCurrentUser, updateNotificationPreferences, type NotificationPreferencesData, type PlusStatusData } from "@/lib/api-client";

const notificationRows = [
  ["morningReminder", "Morning reminder", "A gentle prompt to pick an outfit."],
  ["weatherAlerts", "Weather alerts", "Use weather changes for outfit planning."],
  ["eventPrep", "Event prep", "Plan important looks before the day."],
  ["repeatWarnings", "Repeat warnings", "Notice when a look was worn recently."]
] as const;

export function ProfileIntegrationClient() {
  const session = useSession();
  const [name, setName] = useState("");
  const [notifications, setNotifications] = useState<NotificationPreferencesData["preferences"] | null>(null);
  const [plus, setPlus] = useState<PlusStatusData | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unavailable" | "saved">("idle");

  const loadProfileData = useCallback(async () => {
    setState("loading");
    const [notificationResult, plusResult] = await Promise.all([getNotificationPreferences(), getPlusStatus()]);
    if (notificationResult.ok) setNotifications(notificationResult.data.preferences);
    if (plusResult.ok) setPlus(plusResult.data);
    setState(notificationResult.ok || plusResult.ok ? "idle" : "unavailable");
  }, []);

  useEffect(() => {
    if (session.user?.name) setName(session.user.name);
    if (session.status === "authenticated") void loadProfileData();
  }, [loadProfileData, session.status, session.user?.name]);

  async function saveName() {
    const result = await updateCurrentUser({ name });
    if (result.ok) {
      await session.refresh();
      setState("saved");
    }
  }

  async function toggleNotification(key: keyof NotificationPreferencesData["preferences"]) {
    const next = { ...(notifications || {}), [key]: !notifications?.[key] };
    setNotifications(next as NotificationPreferencesData["preferences"]);
    const result = await updateNotificationPreferences(next);
    if (result.ok) setNotifications(result.data.preferences);
  }

  if (session.status === "loading" || session.status === "logged-out" || session.status === "backend-unavailable") return null;
  if (state === "loading") return <LoadingCard title="Loading profile" />;
  if (state === "unavailable") return <BackendUnavailableState onRetry={loadProfileData} />;

  return (
    <>
      {state === "saved" ? <Card className="mt-5 border-success/20 bg-success/10 p-4"><p className="text-sm font-semibold text-ink">Profile saved</p></Card> : null}
      <section className="mt-7">
        <SectionHeader title="Profile details" />
        <Card className="space-y-3">
          <p className="text-sm text-muted">{session.user?.email}</p>
          <label className="block text-xs font-semibold text-ink">Display name<input className="focus-ring min-h-11 w-full rounded-2xl border border-line bg-canvas/70 px-3 py-2 text-sm text-ink shadow-inner" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <Button className="w-full" onClick={() => void saveName()}>Save profile</Button>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Notifications" />
        <div className="space-y-3">
          {notificationRows.map(([key, label, description]) => (
            <button key={key} type="button" onClick={() => void toggleNotification(key)} className="focus-ring flex min-h-[72px] w-full items-center justify-between gap-4 rounded-xl3 border border-line bg-surface/80 p-4 text-left shadow-card transition hover:border-cocoa/35">
              <span><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span>
              <Chip active={Boolean(notifications?.[key])}>{notifications?.[key] ? "On" : "Off"}</Chip>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="FitPick Plus" action={<Link href="/plus" className="text-xs font-semibold text-cocoa">Open</Link>} />
        <PlusStatusCard status={plus} />
      </section>
    </>
  );
}
