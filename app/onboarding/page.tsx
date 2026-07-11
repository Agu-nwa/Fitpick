import Link from "next/link";
import { OnboardingAccountCard } from "@/components/auth/OnboardingAccountCard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

const steps = [
  { title: "Start with a few favourites", body: "Add the pieces you wear most. You can build the rest over time.", action: "Add pieces" },
  { title: "Tell us what feels like you", body: "Choose the styles, colours, and fits you naturally reach for.", action: "Set preferences" },
  { title: "Find something to wear", body: "Get outfit ideas shaped by your wardrobe, plans, and the weather.", action: "Choose outfit" }
];

const preferences = ["Clean", "Polished", "Comfort", "Native wear", "Neutrals", "Easy layers"];

export default function OnboardingPage() {
  return (
    <AppShell showNav={false} className="flex flex-col justify-between pb-8">
      <section>
        <div className="mb-7 h-72 rounded-[2rem] border border-line bg-gradient-to-br from-stone-50 via-amber-100 to-stone-300 p-5 shadow-soft" role="img" aria-label="wardrobe flat lay preview">
          <div className="flex h-full flex-col justify-end">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">FitPick</p>
            <h1 className="mt-3 max-w-[280px] text-4xl font-semibold tracking-tight text-ink">Let&apos;s make your wardrobe easier to use.</h1>
          </div>
        </div>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <Card key={step.title} className="p-4">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cocoa text-xs font-bold text-white">{index + 1}</span>
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
          <OnboardingAccountCard />
        </div>
      </section>
      <div className="mt-8 grid gap-3">
        <Link href="/wardrobe/add"><Button className="w-full">Add your first pieces</Button></Link>
        <Link href="/home"><Button variant="secondary" className="w-full">Go to FitPick</Button></Link>
      </div>
    </AppShell>
  );
}
