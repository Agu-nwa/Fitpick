import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PermissionCard } from "@/components/ui/PermissionCard";
import { PremiumLockedState } from "@/components/ui/PremiumLockedState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { emptyStates, errorStates, stateSamples } from "@/lib/mock-data";

export default function StatesPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="System states" title="Deployment readiness states" subtitle="Mobile UI patterns for loading, empty, error, permission, offline, upload, AI tagging, and premium flows. Testing is complete and deployment setup is underway." />

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
