import { AppShell } from "@/components/layout/AppShell";
import { ReadinessCard } from "@/components/system/ReadinessCard";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiContracts } from "@/lib/api-contract";
import { backendHandoffAreas, frontendReadiness } from "@/lib/frontend-readiness";

export default function FrontendCompletePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Phase 4D"
        title="Frontend complete"
        subtitle="FitPick is now ready for backend handoff. The app remains mobile-first, mock-data driven, and prepared for real APIs."
      />

      <Card className="bg-cocoa text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Handoff status</p>
          <StatusBadge tone="success">ready</StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Send the backend prompt now.</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">
          The frontend foundation, routes, components, states, mock data, and API contract map are prepared for backend integration.
        </p>
      </Card>

      <section className="mt-7">
        <SectionHeader title="Frontend readiness checklist" />
        <div className="space-y-3">
          {frontendReadiness.map((item) => <ReadinessCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Backend handoff scope" />
        <Card className="p-4">
          <div className="space-y-3">
            {backendHandoffAreas.map((area) => (
              <div key={area} className="flex items-start gap-3 rounded-2xl bg-canvas px-3 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cocoa" aria-hidden="true" />
                <p className="text-sm leading-5 text-ink">{area}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="API contracts prepared" />
        <div className="space-y-3">
          {apiContracts.map((contract) => <BackendReadyCard key={contract.id} contract={contract} />)}
        </div>
      </section>
    </AppShell>
  );
}
