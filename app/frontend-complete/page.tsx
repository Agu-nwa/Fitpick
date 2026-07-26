import { AppShell } from "@/components/layout/AppShell";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ReadinessCard } from "@/components/system/ReadinessCard";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiContracts } from "@/lib/api-contract";
import { frontendReadiness } from "@/lib/frontend-readiness";

const nextIntegrations = [
  "Launch readiness and release checks",
  "Credit purchase activation",
  "Styling quality tuning",
  "Push notification delivery",
  "Mobile app packaging"
];

export default function FrontendCompletePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <CheckCircle2 size={14} aria-hidden="true" />
            Status
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            MyFitPick product status.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Core MyFitPick product areas are connected and ready for final review.
          </p>
        </div>
      </header>

      <Card className="bg-ink text-canvas">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-canvas/60">Product foundation</p>
          <StatusBadge tone="success">complete</StatusBadge>
        </div>
        <h2 className="mt-4 font-editorial text-4xl font-semibold leading-none tracking-editorial">Ready for launch preparation.</h2>
        <p className="mt-3 text-sm leading-6 text-canvas/75">
          Account, closet, styling, previews, preferences, Credits, and payments are connected with clear fallback states.
        </p>
      </Card>

      <section className="mt-7">
        <SectionHeader title="Product readiness checklist" />
        <div className="space-y-3">
          {frontendReadiness.map((item) => <ReadinessCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Next product work" />
        <Card className="p-4">
          <div className="space-y-3">
            {nextIntegrations.map((area) => (
              <div key={area} className="flex items-start gap-3 rounded-2xl border border-line bg-canvas/60 px-3 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cocoa" aria-hidden="true" />
                <p className="text-sm leading-5 text-ink">{area}</p>
              </div>
            ))}
          </div>
          <Link href="/backend-ready" className="mt-4 block text-sm font-semibold text-cocoa">Open product status</Link>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="App connections" />
        <div className="space-y-3">
          {apiContracts.map((contract) => <BackendReadyCard key={contract.id} contract={contract} />)}
        </div>
      </section>
    </AppShell>
  );
}
