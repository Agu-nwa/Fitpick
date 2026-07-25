import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_WIDTH = 1468;
const LOGO_HEIGHT = 479;

const sizeClasses = {
  sm: "w-[116px]",
  md: "w-[140px]",
  lg: "w-[156px]"
};

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
  size = "md"
}: {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center", className)}>
      <Image
        src="/brand/myfitpick-logo.png"
        alt="MyFitPick"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority={priority}
        className={cn("h-auto max-w-full object-contain", sizeClasses[size], imageClassName)}
      />
    </span>
  );
}
