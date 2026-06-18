import { AppShell } from "@/components/layout/AppShell";
import { ReadinessCard } from "@/components/system/ReadinessCard";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiContracts } from "@/lib/api-contract";
import { frontendReadiness } from "@/lib/frontend-readiness";

const nextIntegrations = [
  "Auth screens and session-aware navigation",
  "Wardrobe API list, create, upload metadata, and tag review",
  "Outfit recommendation, swap, save, wear, and feedback",
  "Looks history and saved outfits",
  "FitPick Plus status, limits, and respectful upgrade prompts"
];

export default function FrontendCompletePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Integration ready"
        title="Frontend and backend complete"
        subtitle="FitPick has completed the mobile-first frontend and backend foundation. Integration has started with safe API client, health, and session checks."
      />

      <Card className="bg-cocoa text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Product foundation</p>
          <StatusBadge tone="success">complete</StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Ready for screen-by-screen API integration.</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Mock-data fallbacks remain available while auth, wardrobe, outfit, looks, and Plus flows connect to live endpoints.
        </p>
      </Card>

      <section className="mt-7">
        <SectionHeader title="Frontend readiness checklist" />
        <div className="space-y-3">
          {frontendReadiness.map((item) => <ReadinessCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Next integration work" />
        <Card className="p-4">
          <div className="space-y-3">
            {nextIntegrations.map((area) => (
              <div key={area} className="flex items-start gap-3 rounded-2xl bg-canvas px-3 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cocoa" aria-hidden="true" />
                <p className="text-sm leading-5 text-ink">{area}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="API contracts available" />
        <div className="space-y-3">
          {apiContracts.map((contract) => <BackendReadyCard key={contract.id} contract={contract} />)}
        </div>
      </section>
    </AppShell>
  );
}
