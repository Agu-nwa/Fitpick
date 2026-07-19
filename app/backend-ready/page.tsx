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
  "Integration complete: auth, wardrobe, uploads, AI tag review, outfits, looks, preferences, and Credit wallet",
  "Testing complete: route checks, safety copy scan, secret scan, build, and backend smoke are ready",
  "Deployment path: EC2, PM2, Nginx reverse proxy, and HTTPS-ready production notes"
];

export default function BackendReadyPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <ServerCog size={14} aria-hidden="true" />
            Deployment
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            Production path ready.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Frontend, backend, storage, AI tagging foundation, integration, and testing are prepared for EC2, PM2, and Nginx deployment.
          </p>
        </div>
      </header>

      <Card className="bg-ink text-canvas">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-canvas/60">Integration status</p>
          <StatusBadge tone="success">complete</StatusBadge>
        </div>
        <h2 className="mt-4 font-editorial text-4xl font-semibold leading-none tracking-editorial">MyFitPick is ready for deployment hardening.</h2>
        <p className="mt-3 text-sm leading-6 text-canvas/75">
          Live auth, wardrobe, outfits, looks, preferences, Credits, storage, and AI tagging flows use production routes and fail closed when credentials are missing.
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
            ["Frontend complete", "Mobile app shell, routes, components, states, and production error handling are preserved.", "complete"],
            ["Backend complete", "Auth, wardrobe, outfits, Credits, uploads, admin seed, audit, and smoke checks are available.", "complete"],
            ["API client available", "Safe requests include credentials and mobile-friendly fallback messages.", "complete"],
            ["Health endpoint connected", "GET /api/health is checked from the readiness screen.", "complete"],
            ["Session check connected", "GET /api/auth/me is checked without forcing route protection yet.", "complete"],
            ["S3 storage integrated", "Signed upload, wardrobe image metadata, and generated previews use S3.", "complete"],
            ["AI tagging foundation integrated", "Uploaded clothing photos can request suggested tags before user review.", "complete"],
            ["Testing complete", "Route, safety, secret, build, and smoke-test scripts are available.", "complete"],
            ["Deployment started", "PM2, Nginx, security group, HTTPS, and production checklist docs are available.", "next"]
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
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-line bg-canvas/60 px-3 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cocoa" aria-hidden />
                <p className="text-sm leading-5 text-ink">{step}</p>
              </div>
            ))}
          </div>
          <Link href="/states" className="mt-4 block text-sm font-semibold text-cocoa">Review QA state patterns</Link>
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
