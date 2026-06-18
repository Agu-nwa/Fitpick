import Link from "next/link";
import { OnboardingAccountCard } from "@/components/auth/OnboardingAccountCard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

const steps = [
  { title: "Dress with less stress", body: "FitPick helps you choose outfits from clothes you already own.", action: "Get started" },
  { title: "What do you dress for most?", body: "Work, church, owambe, school, travel, and native Friday can all shape your picks.", action: "Choose occasions" },
  { title: "Add your first clothes", body: "Start with 5–10 items you wear often. You can improve tags later.", action: "Add clothes" }
];

const preferences = ["Clean", "Polished", "Comfort", "Native wear", "Neutrals", "Smart casual"];

export default function OnboardingPage() {
  return (
    <AppShell showNav={false} className="flex flex-col justify-between pb-8">
      <section>
        <div className="mb-7 h-72 rounded-[2rem] border border-line bg-gradient-to-br from-stone-50 via-amber-100 to-stone-300 p-5 shadow-soft" role="img" aria-label="premium wardrobe flat lay preview">
          <div className="flex h-full flex-col justify-end">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">FitPick</p>
            <h1 className="mt-3 max-w-[280px] text-4xl font-semibold tracking-tight text-ink">What should I wear today?</h1>
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
        <Link href="/wardrobe/add"><Button className="w-full">Add first clothes</Button></Link>
        <Link href="/home"><Button variant="secondary" className="w-full">Explore demo app</Button></Link>
      </div>
    </AppShell>
  );
}
