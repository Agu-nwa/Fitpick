import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { plusFeatures } from "@/lib/mock-data";

export default function PlusPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="FitPick Plus" title="More looks, smarter memory" subtitle="Premium appears after value. It gives deeper styling tools without shaming free users." />
      <Card className="bg-cocoa text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Premium styling intelligence</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Plan important looks early.</h2>
        <p className="mt-3 text-sm leading-6 text-white/75">Unlock unlimited outfit picks, advanced swaps, event planning, travel packing, and deeper outfit memory.</p>
        <Button variant="secondary" className="mt-6 w-full bg-white text-cocoa">Upgrade to Plus</Button>
      </Card>

      <section className="mt-7">
        <SectionHeader title="Benefits" />
        <div className="space-y-3">
          {plusFeatures.map((feature) => (
            <Card key={feature.id} className="p-4">
              <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Free vs Plus" />
        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Chip>Free</Chip>
              <p className="mt-3 leading-6 text-muted">Basic wardrobe, limited daily outfit picks, saved looks limit.</p>
            </div>
            <div>
              <Chip active>Plus</Chip>
              <p className="mt-3 leading-6 text-muted">Unlimited picks, travel packing, event planning, advanced outfit memory.</p>
            </div>
          </div>
        </Card>
      </section>
      <Link href="/profile" className="mt-6 block"><Button variant="ghost" className="w-full">Restore purchase</Button></Link>
    </AppShell>
  );
}
