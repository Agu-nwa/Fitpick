import { Layers3 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PermissionCard } from "@/components/ui/PermissionCard";
import { PremiumLockedState } from "@/components/ui/PremiumLockedState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { emptyStates, errorStates, stateSamples } from "@/lib/mock-data";

export default function StatesPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <Layers3 size={14} aria-hidden="true" />
            System states
          </p>
          <h1 className="font-editorial text-balance text-5xl font-semibold leading-[0.9] tracking-editorial text-ink sm:text-6xl lg:text-7xl">
            Readiness states.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Loading, empty, error, permission, offline, upload, AI tagging, and premium patterns.
          </p>
        </div>
      </header>

      <section className="mt-7">
        <SectionHeader title="Loading" />
        <LoadingState title={stateSamples.loading.title} />
      </section>

      <section className="mt-7">
        <SectionHeader title="Empty" />
        <div className="space-y-3">
          <EmptyState {...emptyStates.wardrobe} />
          <EmptyState {...emptyStates.looks} />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Error and offline" />
        <div className="space-y-3">
          <ErrorState {...errorStates.upload} />
          <ErrorState {...stateSamples.offline} />
          <ErrorState {...stateSamples.notEnoughItems} />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Permissions and premium" />
        <div className="space-y-3">
          <PermissionCard title={stateSamples.permission.title} body={stateSamples.permission.body} />
          <PremiumLockedState title={stateSamples.premiumLocked.title} body={stateSamples.premiumLocked.body} />
        </div>
      </section>
    </AppShell>
  );
}
