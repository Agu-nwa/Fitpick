import { Suspense } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ContextualTip } from "@/components/onboarding/ContextualTip";
import { WardrobeListClient } from "@/components/wardrobe/WardrobeListClient";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function WardrobePage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line/80 bg-surface/82 p-6 shadow-card backdrop-blur-xl sm:p-9">
        <div className="absolute right-[-5rem] top-[-6rem] size-56 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-64 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <Sparkles size={14} aria-hidden="true" />
              Curated wardrobe
            </p>
            <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.95] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
              Your digital closet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Build a clean style archive for outfits, weather-aware picks, and try-on previews.
            </p>
          </div>
          <Link href="/wardrobe/add" className="shrink-0">
            <Button className="w-full rounded-full sm:w-auto">
              <Plus size={18} aria-hidden="true" />
              Add a piece
            </Button>
          </Link>
        </div>
      </header>

      <div className="mt-5">
        <ContextualTip tipId="closet" dismissedTips={auth.user.onboardingTipsDismissed}>
          Upload more wardrobe items to improve outfit recommendations.
        </ContextualTip>
      </div>

      <Suspense fallback={null}>
        <WardrobeListClient />
      </Suspense>
    </AppShell>
  );
}
