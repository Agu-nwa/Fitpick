import Image from "next/image";
import { cn } from "@/lib/utils";

const cards = [
  {
    src: "/fashion/product-blue-blouse.webp",
    className: "left-[7%] top-[13%] h-48 w-36 rotate-[-4deg] lg:h-64 lg:w-48"
  },
  {
    src: "/fashion/product-blush-bag.webp",
    className: "left-[11%] top-[48%] h-40 w-32 rotate-[3deg] lg:h-56 lg:w-44"
  },
  {
    src: "/fashion/editorial-blue-blouse.webp",
    className: "right-[7%] top-[12%] h-48 w-36 rotate-[3deg] lg:h-64 lg:w-48"
  },
  {
    src: "/fashion/editorial-male-teal.webp",
    className: "right-[10%] top-[48%] h-52 w-40 rotate-[-2deg] lg:h-72 lg:w-56"
  },
  {
    src: "/fashion/product-male-overshirt.webp",
    className: "left-[3%] bottom-[6%] h-40 w-32 rotate-[2deg] lg:h-56 lg:w-44"
  },
  {
    src: "/fashion/product-espresso-boots.webp",
    className: "right-[4%] bottom-[5%] h-40 w-32 rotate-[-3deg] lg:h-56 lg:w-44"
  }
];

const mobileCards = [
  {
    src: "/fashion/editorial-male-teal.webp",
    className: "-right-10 top-20 h-44 w-32 rotate-[4deg]"
  },
  {
    src: "/fashion/product-blush-bag.webp",
    className: "-left-8 bottom-24 h-36 w-28 rotate-[-5deg]"
  }
];

export function FashionBackdrop({
  className,
  density = "full"
}: {
  className?: string;
  density?: "full" | "soft";
}) {
  const visibleCards = density === "soft" ? cards.slice(0, 4) : cards;

  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.76),transparent_28rem),radial-gradient(circle_at_80%_18%,rgba(232,183,172,0.28),transparent_18rem),radial-gradient(circle_at_18%_80%,rgba(216,185,140,0.24),transparent_22rem)]" />
      <div className="absolute left-1/2 top-[42%] h-32 w-32 -translate-x-1/2 rounded-full bg-lime/20 blur-3xl" />
      <div className="md:hidden">
        {mobileCards.map((card, index) => (
          <div
            key={card.src}
            className={cn(
              "absolute overflow-hidden rounded-[1.1rem] border border-white/70 bg-white opacity-25 shadow-card",
              index % 2 === 0 ? "fashion-float-a" : "fashion-float-b",
              card.className
            )}
            style={{ animationDelay: `${index * 0.45}s` }}
          >
            <Image
              src={card.src}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
              loading="lazy"
              unoptimized
            />
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        {visibleCards.map((card, index) => (
          <div
            key={card.src}
            className={cn(
              "absolute overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-soft",
              index % 2 === 0 ? "fashion-float-a" : "fashion-float-b",
              density === "soft" ? "opacity-35" : "opacity-95",
              card.className
            )}
            style={{ animationDelay: `${index * 0.4}s` }}
          >
            <Image
              src={card.src}
              alt=""
              fill
              sizes={density === "soft" ? "192px" : "224px"}
              className="object-cover"
              loading="lazy"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}
