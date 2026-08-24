"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Folder, Images, Sparkles } from "lucide-react";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { ImagePreviewDialog, type ImagePreviewDialogImage } from "@/components/ui/ImagePreviewDialog";
import { useSession } from "@/hooks/use-session";
import { getTryOnHistory, type TryOnHistoryItem } from "@/lib/api-client";

function formatTryOnDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date;
}

function weekKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekLabel(weekStart: Date) {
  const currentWeek = startOfWeek(new Date());
  const previousWeek = new Date(currentWeek);
  previousWeek.setDate(previousWeek.getDate() - 7);

  if (weekStart.getTime() === currentWeek.getTime()) return "This week";
  if (weekStart.getTime() === previousWeek.getTime()) return "Last week";

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startMonth = new Intl.DateTimeFormat(undefined, { month: "short" }).format(weekStart);
  const endMonth = new Intl.DateTimeFormat(undefined, { month: "short" }).format(weekEnd);
  const startYear = weekStart.getFullYear();
  const endYear = weekEnd.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${weekStart.getDate()}, ${startYear} – ${endMonth} ${weekEnd.getDate()}, ${endYear}`;
  }
  if (weekStart.getMonth() !== weekEnd.getMonth()) {
    return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}, ${endYear}`;
  }
  return `${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}, ${endYear}`;
}

function TryOnHistoryLoading() {
  return (
    <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="Loading Try-On history" aria-live="polite">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-canvasSubtle" />
      ))}
    </div>
  );
}

export function TryOnHistoryClient() {
  const session = useSession();
  const [tryOns, setTryOns] = useState<TryOnHistoryItem[]>([]);
  const [viewingImage, setViewingImage] = useState<ImagePreviewDialogImage | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "unavailable" | "error">("idle");

  const loadHistory = useCallback(async () => {
    setStatus("loading");
    const result = await getTryOnHistory();
    if (result.ok) {
      setTryOns(result.data.tryOns);
      setStatus(result.data.tryOns.length ? "ready" : "empty");
      return;
    }
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadHistory();
  }, [loadHistory, session.status]);

  const weeklyTryOns = useMemo(() => {
    const groups = new Map<string, { label: string; tryOns: TryOnHistoryItem[] }>();

    for (const tryOn of tryOns) {
      const completedAt = tryOn.completedAt ? new Date(tryOn.completedAt) : null;
      const hasValidDate = completedAt && !Number.isNaN(completedAt.getTime());
      const start = hasValidDate ? startOfWeek(completedAt) : null;
      const key = start ? weekKey(start) : "date-unavailable";
      const existing = groups.get(key);

      if (existing) {
        existing.tryOns.push(tryOn);
      } else {
        groups.set(key, {
          label: start ? formatWeekLabel(start) : "Date unavailable",
          tryOns: [tryOn]
        });
      }
    }

    return Array.from(groups.entries()).map(([key, group]) => ({ key, ...group }));
  }, [tryOns]);

  if (session.status === "loading" || status === "loading" || (session.status === "authenticated" && status === "idle")) {
    return <TryOnHistoryLoading />;
  }
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadHistory} />;
  }
  if (status === "error") {
    return <ApiErrorState title="Try-On history unavailable" message="MyFitPick could not load your previous Try-On images right now." onRetry={loadHistory} />;
  }
  if (status === "empty") {
    return (
      <section className="mt-8 rounded-2xl border border-line bg-surface px-5 py-12 text-center sm:px-8" aria-labelledby="empty-tryon-title">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-canvasSubtle text-cocoa"><Images size={21} aria-hidden="true" /></span>
        <h2 id="empty-tryon-title" className="mt-5 text-2xl font-semibold tracking-tight text-ink">No try-ons yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Try on an outfit and your generated results will appear here.</p>
        <Link href="/stylist/create-look" className="focus-ring mx-auto mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cocoa px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-sageDark active:scale-[0.985]">
          <Sparkles size={16} aria-hidden="true" />
          Try on a look
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-7" aria-labelledby="tryon-gallery-title">
      <h2 id="tryon-gallery-title" className="sr-only">Previous Try-On results</h2>
      <div className="space-y-4">
        {weeklyTryOns.map((week) => (
          <details key={week.key} className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 transition hover:bg-canvasSubtle active:bg-canvas [&::-webkit-details-marker]:hidden sm:px-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cocoa/10 text-cocoa">
                <Folder size={20} aria-hidden="true" />
              </span>
              <h3 className="min-w-0 flex-1 font-editorial text-xl font-semibold text-ink sm:text-2xl">{week.label}</h3>
              <span className="shrink-0 text-xs font-semibold text-muted">{week.tryOns.length} {week.tryOns.length === 1 ? "look" : "looks"}</span>
              <ChevronDown size={19} className="shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-2 gap-3 border-t border-line p-4 sm:grid-cols-3 sm:gap-4 sm:p-5 lg:grid-cols-4">
              {week.tryOns.map((tryOn) => {
                const date = formatTryOnDate(tryOn.completedAt);
                return (
                  <button
                    key={tryOn.generationId}
                    type="button"
                    onClick={() => setViewingImage({
                      src: tryOn.previewUrl,
                      alt: date ? `Virtual Try-On result from ${date}` : "Virtual Try-On result",
                      title: "Virtual Try-On",
                      subtitle: date
                    })}
                    className="focus-ring group min-w-0 rounded-2xl text-left"
                    aria-label={date ? `Open Virtual Try-On from ${date}` : "Open Virtual Try-On"}
                  >
                    <ImageFrame
                      src={tryOn.previewUrl}
                      alt={date ? `Virtual Try-On result from ${date}` : "Virtual Try-On result"}
                      aspect="fullBody"
                      fit="contain"
                      context="looks.tryon_history"
                      className="w-full bg-surface transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-soft"
                    />
                    {date ? <time dateTime={tryOn.completedAt || undefined} className="mt-2 block truncate px-1 text-xs font-medium text-muted">{date}</time> : null}
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>
      <ImagePreviewDialog image={viewingImage} onClose={() => setViewingImage(null)} />
    </section>
  );
}
