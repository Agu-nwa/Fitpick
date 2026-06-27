import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ImageFrameAspect = "square" | "portrait" | "wide";

const aspectClasses: Record<ImageFrameAspect, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  wide: "aspect-[16/10]"
};

export function ImageFrame({
  src,
  alt,
  placeholder,
  overlay,
  aspect = "square",
  className,
  imageClassName
}: {
  src?: string | null;
  alt: string;
  placeholder?: ReactNode;
  overlay?: ReactNode;
  aspect?: ImageFrameAspect;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#F7F4EE] via-surface to-[#EDE3D5]",
        aspectClasses[aspect],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
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
