import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { emptyStates, savedLooks, wornLooks } from "@/lib/mock-data";

const tabs = ["Saved", "Worn", "Favorites"];

export default function LooksPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Looks" title="Your looks" subtitle="Saved outfits and outfits you have worn." />
      <div className="mb-6 flex gap-2">
        {tabs.map((tab, index) => <Chip key={tab} active={index === 0}>{tab}</Chip>)}
      </div>

      <section>
        <SectionHeader title="Saved" />
        <div className="space-y-4">
          {savedLooks.map((look) => (
            <Link key={look.id} href={`/outfit/${look.id}`} className="block rounded-xl3">
              <OutfitCard outfit={look} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Worn history" />
        <div className="space-y-3">
          {wornLooks.map((look) => (
            <Card key={`${look.id}-${look.wornOn}`} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{look.title}</h3>
                  <p className="mt-1 text-xs text-muted">Worn on {look.wornOn}</p>
                </div>
                <Link href={`/outfit/${look.id}`}><Button variant="secondary">Wear again</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Repeat warning sample" />
        <Card className="border-warning/30 bg-warning/5">
          <h3 className="text-sm font-semibold text-ink">You wore a similar look recently.</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Refresh it with a different top or shoes.</p>
          <Button variant="secondary" className="mt-4 w-full">Refresh outfit</Button>
        </Card>
      </section>

      <section className="mt-7">
        <EmptyState {...emptyStates.looks} />
      </section>
    </AppShell>
  );
}
