import { AuthStatusCard } from "@/components/auth/AuthStatusCard";
import Link from "next/link";
import { ServerCog } from "lucide-react";
import { BackendHealthCard } from "@/components/integration/BackendHealthCard";
import { AppShell } from "@/components/layout/AppShell";
import { BackendReadyCard } from "@/components/system/BackendReadyCard";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiContracts } from "@/lib/api-contract";

const integrationSteps = [
  "Core product flow: account, closet, uploads, review, outfits, previews, preferences, and Credits",
  "Review checks available: route checks, safety copy scan, secret scan, build, and backend smoke are ready",
  "Launch path: release checks and production operations notes"
];

export default function BackendReadyPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <ServerCog size={14} aria-hidden="true" />
            Status
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            MyFitPick status.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Core MyFitPick product areas are connected and ready for final review.
          </p>
        </div>
      </header>

      <Card className="bg-ink text-canvas">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-canvas/60">Integration status</p>
          <StatusBadge tone="success">complete</StatusBadge>
        </div>
        <h2 className="mt-4 font-editorial text-4xl font-semibold leading-none tracking-editorial">MyFitPick is ready for review.</h2>
        <p className="mt-3 text-sm leading-6 text-canvas/75">
          Core account, closet, styling, preview, Credits, and payment flows are connected.
        </p>
      </Card>

      <section className="mt-7">
        <SectionHeader title="App checks" />
        <div className="space-y-3">
          <BackendHealthCard />
          <AuthStatusCard />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Product status" />
        <div className="space-y-3">
          {[
            ["Frontend complete", "Mobile app shell, routes, components, states, and production error handling are preserved.", "complete"],
            ["Backend complete", "Auth, wardrobe, outfits, Credits, uploads, admin seed, audit, and smoke checks are available.", "complete"],
            ["App connection available", "Core app requests use clear messages and secure sessions.", "complete"],
            ["App health connected", "Core app health can be checked safely.", "complete"],
            ["Session check connected", "Sign-in state can be checked safely.", "complete"],
            ["Image handling connected", "Closet images and previews are saved for later use.", "complete"],
            ["Garment review connected", "Uploaded pieces can be reviewed before saving.", "complete"],
            ["Review checks available", "Product review checks are available.", "complete"],
            ["Status started", "Launch checklist materials are available.", "next"]
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
        <SectionHeader title="Next product phases" />
        <Card className="p-4">
          <div className="space-y-3">
            {integrationSteps.map((step) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-line bg-canvas/60 px-3 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cocoa" aria-hidden />
                <p className="text-sm leading-5 text-ink">{step}</p>
              </div>
            ))}
          </div>
          <Link href="/states" className="mt-4 block text-sm font-semibold text-cocoa">Review app states</Link>
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
