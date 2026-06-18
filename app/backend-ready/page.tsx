import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import { BackendHealthCard } from "@/components/integration/BackendHealthCard";
import { AppShell } from "@/components/layout/AppShell";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiContracts } from "@/lib/api-contract";

const integrationSteps = [
  "Phase 6A: API client, health check, and session check foundation",
  "Phase 6B: authentication screens and session-aware navigation",
  "Phase 6C: wardrobe list, create, upload metadata, and tag review",
  "Phase 6D: outfit recommendation, looks, feedback, and Plus status"
];

export default function BackendReadyPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Integration Phase 6A"
        title="Backend connected foundation"
        subtitle="Frontend and backend foundations are complete. FitPick is now starting safe, screen-by-screen API integration."
      />

      <Card className="bg-cocoa text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Integration status</p>
          <StatusBadge tone="warning">in progress</StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">API client, health, and session checks are available.</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Mock data remains in place while live backend integration begins carefully across auth, wardrobe, outfits, looks, and Plus.
        </p>
      </Card>

      <section className="mt-7">
        <SectionHeader title="Live integration checks" />
        <div className="space-y-3">
          <BackendHealthCard />
          <AuthStatusCard />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Phase status" />
        <div className="space-y-3">
          {[
            ["Frontend complete", "Mobile app shell, routes, components, states, and mock fallbacks are preserved.", "complete"],
            ["Backend complete", "Auth, wardrobe, outfits, Plus, uploads, admin seed, audit, and smoke checks are available.", "complete"],
            ["API client available", "Safe requests include credentials and mobile-friendly fallback messages.", "complete"],
            ["Health endpoint connected", "GET /api/health is checked from the readiness screen.", "complete"],
            ["Session check connected", "GET /api/auth/me is checked without forcing route protection yet.", "complete"]
          ].map(([title, detail, status]) => (
            <Card key={title} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
                </div>
                <StatusBadge tone={status === "complete" ? "success" : "warning"}>{status}</StatusBadge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Next integration phases" />
        <Card className="p-4">
          <div className="space-y-3">
            {integrationSteps.map((step) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl bg-canvas px-3 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cocoa" aria-hidden />
                <p className="text-sm leading-5 text-ink">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="API contracts" />
        <div className="space-y-3">
          {apiContracts.map((contract) => <BackendReadyCard key={contract.id} contract={contract} />)}
        </div>
      </section>
    </AppShell>
  );
}
