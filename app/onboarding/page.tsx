import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EssentialModelSetup } from "@/components/onboarding/EssentialModelSetup";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

const steps = [
  { title: "Set your style starting point", body: "Share a few preferences so MyFitPick has taste direction from day one." },
  { title: "Add a few pieces", body: "Start with the clothing, shoes, bags, and accessories you reach for often." },
  { title: "Ask your Stylist", body: "Get outfit ideas shaped by your closet, plans, and the context you choose to add." }
];

const preferences = ["Clean", "Polished", "Comfort", "Minimal", "Neutrals", "Easy layers"];

export default function OnboardingPage() {
  return (
    <AppShell showNav={false} className="flex flex-col justify-between pb-8">
      <section>
        <div className="mb-7 h-80 overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card" role="img" aria-label="wardrobe flat lay preview">
          <div className="flex h-full flex-col justify-end bg-[radial-gradient(circle_at_80%_10%,rgba(166,124,82,0.22),transparent_34%)]">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-cocoa">
            <CheckCircle2 size={14} aria-hidden="true" />
              Style start
          </p>
            <h1 className="mt-3 max-w-[420px] font-editorial text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl">Start with your style.</h1>
          </div>
        </div>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="p-4">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cocoa text-xs font-bold text-canvas">{index + 1}</span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted">{step.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {preferences.map((item, index) => <Chip key={item} active={index < 2}>{item}</Chip>)}
        </div>
        <div className="mt-5">
          <EssentialModelSetup />
        </div>
      </section>
    </AppShell>
  );
}
