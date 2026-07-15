import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitRecommendationClient } from "@/components/outfit/OutfitRecommendationClient";
import { OutfitGeneratingState } from "@/components/outfit/OutfitIntegrationStates";

export default function OutfitPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-72 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <Sparkles size={14} aria-hidden="true" />
            Outfit edit
          </p>
          <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
            Build today&apos;s look.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Tell FitPick what you need and it will choose from your saved clothes, complete the outfit, and prepare it for try-on.
          </p>
        </div>
      </header>
      <Suspense fallback={<OutfitGeneratingState />}>
        <OutfitRecommendationClient />
      </Suspense>
    </AppShell>
  );
}
