"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { MobileAccountNav } from "@/components/navigation/MobileAccountNav";

type HeaderConfig = {
  title: string;
  closeHref: string;
  closeLabel: string;
  dismissible?: boolean;
};

const rootPages = new Set(["/", "/home", "/wardrobe", "/stylist", "/profile", "/support", "/admin"]);

function routeHeaderConfig(pathname: string): HeaderConfig | null {
  if (rootPages.has(pathname)) return null;
  if (pathname.startsWith("/admin/support-api")) return { title: "Support API", closeHref: "/admin", closeLabel: "Close support API console" };
  if (pathname.startsWith("/admin/support")) return { title: "Support", closeHref: "/admin", closeLabel: "Close support console" };
  if (pathname.startsWith("/wardrobe/add") || pathname.startsWith("/wardrobe/upload")) {
    return { title: "Add to Closet", closeHref: "/wardrobe", closeLabel: "Close closet upload", dismissible: true };
  }
  if (pathname.startsWith("/wardrobe/") && pathname.endsWith("/confirm")) {
    return { title: "Review Item", closeHref: "/wardrobe", closeLabel: "Close item review", dismissible: true };
  }
  if (pathname.startsWith("/wardrobe/")) return { title: "Closet Item", closeHref: "/wardrobe", closeLabel: "Close item details" };
  if (pathname.startsWith("/stylist/create-look")) return { title: "Create a Look", closeHref: "/stylist", closeLabel: "Close create a look" };
  if (pathname.startsWith("/stylist/match")) return { title: "Match an Outfit", closeHref: "/stylist", closeLabel: "Close match an outfit" };
  if (pathname.startsWith("/outfit/") && pathname.endsWith("/preview")) return { title: "Preview Look", closeHref: "/stylist", closeLabel: "Close preview" };
  if (pathname.startsWith("/outfit/")) return { title: "Outfit Detail", closeHref: "/stylist", closeLabel: "Close outfit detail" };
  if (pathname === "/outfit") return { title: "Outfits", closeHref: "/stylist", closeLabel: "Close outfits" };
  if (pathname.startsWith("/wallet")) return { title: "Credits", closeHref: "/profile", closeLabel: "Close Credits" };
  if (pathname.startsWith("/profile/preferences") || pathname === "/settings" || pathname === "/preferences" || pathname === "/style-profile") {
    return { title: "Preferences", closeHref: "/profile", closeLabel: "Close preferences" };
  }
  if (pathname === "/occasion") return { title: "Occasion", closeHref: "/stylist", closeLabel: "Close occasion" };
  if (pathname === "/avatar") return { title: "My Model", closeHref: "/profile", closeLabel: "Close My Model" };
  if (pathname === "/onboarding") return { title: "Set Up", closeHref: "/home", closeLabel: "Close onboarding", dismissible: true };
  if (pathname === "/states" || pathname === "/backend-ready" || pathname === "/frontend-complete") {
    return { title: "Readiness", closeHref: "/admin", closeLabel: "Close readiness page" };
  }
  return null;
}

function ContextPageHeader({ config }: { config: HeaderConfig }) {
  const router = useRouter();

  return (
    <header className="sticky top-[var(--safe-top)] z-30 mb-6 border-b border-cocoa/15 bg-canvas/95 px-1 py-2 backdrop-blur-xl">
      <div className={config.dismissible ? "grid min-h-12 grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center gap-2" : "grid min-h-12 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-2 pr-[3.25rem]"}>
        <button
          type="button"
          onClick={() => router.back()}
          className="focus-ring inline-flex size-11 items-center justify-center rounded-xl text-muted transition hover:bg-canvasSubtle hover:text-ink active:scale-[0.97]"
          aria-label="Go back"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <p className="min-w-0 truncate text-center text-sm font-bold text-ink sm:text-base">{config.title}</p>
        {config.dismissible ? (
          <Link
            href={config.closeHref}
            className="focus-ring inline-flex size-11 items-center justify-center rounded-xl text-muted transition hover:bg-canvasSubtle hover:text-ink active:scale-[0.97]"
            aria-label={config.closeLabel}
          >
            <X size={18} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function ContextPageChrome({ showAccountNav, closeHref }: { showAccountNav: boolean; closeHref?: string }) {
  const pathname = usePathname();
  const routeConfig = routeHeaderConfig(pathname);
  const config = routeConfig && closeHref
    ? { ...routeConfig, closeHref }
    : routeConfig;

  if (config) return <ContextPageHeader config={config} />;
  if (showAccountNav) return <MobileAccountNav />;
  return null;
}
