import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { OutfitItemCard } from "@/components/outfit/OutfitItemCard";
import { OutfitActions } from "@/components/outfit/OutfitActions";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { outfitRecommendations } from "@/lib/mock-data";

export default function OutfitDetailPage({ params }: { params: { id: string } }) {
  const outfit = outfitRecommendations.find((entry) => entry.id === params.id);
  if (!outfit) notFound();

  return (
    <AppShell>
      <PageHeader eyebrow="Outfit detail" title={outfit.title} subtitle={outfit.summary} />
      <OutfitCard outfit={outfit} />

      <section className="mt-7">
        <SectionHeader title="Why this works" />
        <Card className="space-y-4">
          <p className="text-sm leading-6 text-muted">This look fits the occasion, keeps the colors balanced, and uses wardrobe pieces with good readiness signals.</p>
          <div className="flex flex-wrap gap-2">
            {outfit.reasonChips.map((chip) => <Chip key={chip}>{chip}</Chip>)}
          </div>
        </Card>
      </section>

      <section className="mt-7 space-y-3">
        <SectionHeader title="Styling notes" />
        <Card><strong className="text-ink">Weather:</strong> <span className="text-muted">{outfit.weatherFit}</span></Card>
        <Card><strong className="text-ink">Color:</strong> <span className="text-muted">{outfit.colorNote}</span></Card>
        <Card><strong className="text-ink">Repeat:</strong> <span className="text-muted">{outfit.repeatNote}</span></Card>
        <Card><strong className="text-ink">Care:</strong> <span className="text-muted">{outfit.careNote}</span></Card>
      </section>

      <section className="mt-7">
        <SectionHeader title="Item breakdown" />
        <div className="mobile-scrollbar flex gap-3 overflow-x-auto pb-2">
          {outfit.items.map((item) => <OutfitItemCard key={item.id} item={item} />)}
        </div>
      </section>

      <OutfitActions />
    </AppShell>
  );
}
