import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CTABar } from "@/components/ui/CTABar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { wardrobeItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function WardrobeItemDetailPage({ params }: { params: { id: string } }) {
  const item = wardrobeItems.find((entry) => entry.id === params.id);
  if (!item) notFound();

  const status = item.condition === "needs-care" ? "Needs care" : item.condition === "missing-tags" ? "Missing tags" : "Ready";

  return (
    <AppShell>
      <PageHeader eyebrow="Wardrobe item" title={item.name} subtitle="Review tags, readiness, and outfit matching details." />
      <div className={cn("h-80 rounded-[2rem] border border-line bg-gradient-to-br shadow-soft", item.imageTone)} role="img" aria-label={item.name} />

      <section className="mt-7">
        <SectionHeader title="Item tags" />
        <Card>
          <div className="flex flex-wrap gap-2">
            <Chip active>{item.category}</Chip>
            <Chip>{item.color}</Chip>
            {item.pattern ? <Chip>{item.pattern}</Chip> : null}
            <Chip>{status}</Chip>
            {item.lastWorn ? <Chip>Last worn: {item.lastWorn}</Chip> : null}
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Works for" />
        <Card>
          <div className="flex flex-wrap gap-2">
            {item.occasions.map((occasion) => <Chip key={occasion}>{occasion}</Chip>)}
          </div>
        </Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Weather fit" />
        <Card>
          <div className="flex flex-wrap gap-2">
            {item.weather.map((weather) => <Chip key={weather}>{weather}</Chip>)}
          </div>
        </Card>
      </section>

      <CTABar className="mt-6 grid grid-cols-2 gap-2">
        <Button>Edit tags</Button>
        <Link href="/wardrobe/add"><Button variant="secondary" className="w-full">Add similar</Button></Link>
      </CTABar>
    </AppShell>
  );
}
