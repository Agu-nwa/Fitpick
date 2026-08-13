"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Images, Sparkles } from "lucide-react";
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
        <Link href="/stylist/create-look" className="focus-ring mx-auto mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cocoa px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#456A66] active:scale-[0.985]">
          <Sparkles size={16} aria-hidden="true" />
          Try on a look
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-7" aria-labelledby="tryon-gallery-title">
      <h2 id="tryon-gallery-title" className="sr-only">Previous Try-On results</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tryOns.map((tryOn) => {
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
      <ImagePreviewDialog image={viewingImage} onClose={() => setViewingImage(null)} />
    </section>
  );
}
