import Link from "next/link";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ContextualTip } from "@/components/onboarding/ContextualTip";
import { StylistChat } from "@/components/stylist/StylistChat";
import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MatchOutfitPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  return (
    <AppShell>
      <header className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/stylist" className="focus-ring mb-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface/80 px-4 text-xs font-bold uppercase tracking-[0.14em] text-muted transition hover:text-ink">
            <ArrowLeft size={15} aria-hidden="true" />
            Stylist
          </Link>
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-cocoa">
            <ImagePlus size={14} aria-hidden="true" />
            Match an Outfit
          </p>
          <h1 className="font-editorial text-4xl font-semibold leading-none text-ink sm:text-5xl">Match an Outfit</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            Bring a photo or screenshot and let MyFitPick style it with your closet.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
          3 options
        </p>
      </header>
      <ContextualTip tipId="match-outfit" dismissedTips={auth.user.onboardingTipsDismissed}>
        Upload a shopping screenshot or product photo and FitPick will match it with your wardrobe.
      </ContextualTip>
      <StylistChat initialFlow="match" productMode="match" />
    </AppShell>
  );
}
