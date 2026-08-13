"use client";

/* eslint-disable @next/next/no-img-element -- This component intentionally owns remote-image fallback and retry behavior that Next Image does not provide. */

import * as Sentry from "@sentry/nextjs";
import { ImageOff, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { buildImageCandidates, safeImageFailureMetadata } from "@/lib/image-reliability";
import { cn } from "@/lib/utils";

type ImageFrameAspect = "square" | "portrait" | "fullBody" | "wide";
type ImageFrameFit = "cover" | "contain";

const aspectClasses: Record<ImageFrameAspect, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  fullBody: "aspect-[3/4]",
  wide: "aspect-[16/10]"
};

const fitClasses: Record<ImageFrameFit, string> = {
  cover: "object-cover",
  contain: "object-contain"
};

export function ImageFrame({
  src,
  fallbackSrc,
  alt,
  placeholder,
  overlay,
  aspect = "square",
  fit = "cover",
  className,
  imageClassName,
  showRetry = false,
  context = "image"
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  placeholder?: ReactNode;
  overlay?: ReactNode;
  aspect?: ImageFrameAspect;
  fit?: ImageFrameFit;
  className?: string;
  imageClassName?: string;
  showRetry?: boolean;
  context?: string;
}) {
  const candidates = useMemo(() => buildImageCandidates(src, fallbackSrc), [src, fallbackSrc]);
  const candidateKey = candidates.join("\n");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
    setFailed(false);
    setRetryCount(0);
  }, [candidateKey]);

  const currentSrc = candidates[candidateIndex] || "";

  function handleImageError() {
    const hasFallback = candidateIndex + 1 < candidates.length;
    const metadata = safeImageFailureMetadata({
      src: currentSrc,
      context,
      attempt: candidateIndex + 1,
      fallbackAvailable: hasFallback
    });

    Sentry.captureMessage("Image failed to render", {
      level: hasFallback ? "warning" : "error",
      tags: {
        area: "image_render",
        context: metadata.context,
        host: metadata.host,
        protocol: metadata.protocol,
        fallback_available: String(metadata.fallbackAvailable)
      },
      extra: { attempt: metadata.attempt }
    });

    if (hasFallback) {
      setCandidateIndex((value) => value + 1);
      return;
    }
    setFailed(true);
  }

  function retry() {
    setFailed(false);
    setCandidateIndex(0);
    setRetryCount((value) => value + 1);
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink/10 via-surface to-olive/20",
        aspectClasses[aspect],
        className
      )}
    >
      {currentSrc && !failed ? (
        <img
          key={`${currentSrc}:${retryCount}`}
          src={currentSrc}
          alt={alt}
          className={cn("h-full w-full", fitClasses[fit], imageClassName)}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
            handleImageError();
          }}
        />
      ) : failed ? (
        <div className="flex h-full min-h-28 w-full flex-col items-center justify-center px-4 text-center text-muted" role="status">
          <ImageOff size={22} className="text-cocoa" aria-hidden="true" />
          <span className="mt-2 text-xs font-semibold text-ink">Image unavailable</span>
          <span className="mt-1 text-[11px] leading-4">Your item is safe. This photo could not be loaded.</span>
          {showRetry ? (
            <button
              type="button"
              onClick={retry}
              className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-cocoa"
            >
              <RotateCcw size={14} aria-hidden="true" />
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold leading-5 text-muted">
          {placeholder}
        </div>
      )}
      {overlay ? <div className="absolute inset-x-2 bottom-2">{overlay}</div> : null}
    </div>
  );
}
