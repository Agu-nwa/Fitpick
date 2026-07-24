import { Suspense } from "react";
import { UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { UnifiedProfileClient } from "@/components/profile/UnifiedProfileClient";
import { Card } from "@/components/ui/Card";

export default function ProfilePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <UserRound size={14} aria-hidden="true" />
            Profile
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            Your MyFitPick profile.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Manage your personal details, appearance, style preferences, city, Credits, and account in one calm place.
          </p>
        </div>
      </header>

      <Suspense fallback={<Card className="mt-6"><p className="text-sm font-semibold text-ink">Loading profile...</p></Card>}>
        <UnifiedProfileClient />
      </Suspense>
    </AppShell>
  );
}
