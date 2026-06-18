import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { ReadinessCard } from "@/components/system/ReadinessCard";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiContracts } from "@/lib/api-contract";
import { frontendReadiness } from "@/lib/frontend-readiness";

const nextIntegrations = [
  "Deployment Phase 8: EC2, PM2, Nginx, security groups, HTTPS readiness, and release checks",
  "Production payment activation for Stripe and Paystack",
  "Production AI provider tuning",
  "Push notification delivery",
  "App store packaging"
];

export default function FrontendCompletePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Deployment ready"
        title="Frontend, backend, and testing complete"
        subtitle="FitPick has completed the mobile-first frontend, backend, storage, AI tagging foundation, integration, and testing phases."
      />

      <Card className="bg-cocoa text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Product foundation</p>
          <StatusBadge tone="success">complete</StatusBadge>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Ready for production deployment setup.</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Auth, wardrobe, uploads, AI tagging, outfits, looks, preferences, Plus, and payment foundation are connected with safe fallbacks and QA scripts.
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
          <Link href="/backend-ready" className="mt-4 block text-sm font-semibold text-cocoa">Open integration readiness</Link>
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
