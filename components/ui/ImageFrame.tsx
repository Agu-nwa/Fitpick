import type { ReactNode } from "react";
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
  alt,
  placeholder,
  overlay,
  aspect = "square",
  fit = "cover",
  className,
  imageClassName
}: {
  src?: string | null;
  alt: string;
  placeholder?: ReactNode;
  overlay?: ReactNode;
  aspect?: ImageFrameAspect;
  fit?: ImageFrameFit;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-ink/10 via-surface to-olive/20",
        aspectClasses[aspect],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full", fitClasses[fit], imageClassName)}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold leading-5 text-muted">
          {placeholder}
        </div>
      )}
      {overlay ? <div className="absolute inset-x-2 bottom-2">{overlay}</div> : null}
    </div>
  );
}
