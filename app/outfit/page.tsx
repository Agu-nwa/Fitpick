import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { OutfitItemCard } from "@/components/outfit/OutfitItemCard";
import { OutfitActions } from "@/components/outfit/OutfitActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { outfitRecommendations } from "@/lib/mock-data";

export default function OutfitPage() {
  const outfit = outfitRecommendations[0];
  return (
    <AppShell>
      <OutfitCard outfit={outfit} />
      <section className="mt-7">
        <SectionHeader title="Items in this look" />
        <div className="mobile-scrollbar flex gap-3 overflow-x-auto pb-2">
          {outfit.items.map((item) => <OutfitItemCard key={item.id} item={item} />)}
        </div>
      </section>
      <section className="mt-7">
        <SectionHeader title="Why this works" />
        <Card>
          <p className="text-sm leading-6 text-muted">This look fits the occasion, keeps the colors balanced, and uses items you have not worn recently.</p>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p><strong className="text-ink">Weather:</strong> {outfit.weatherFit}</p>
            <p><strong className="text-ink">Color:</strong> {outfit.colorNote}</p>
            <p><strong className="text-ink">Repeat:</strong> {outfit.repeatNote}</p>
            <p><strong className="text-ink">Care:</strong> {outfit.careNote}</p>
          </div>
          <Link href={`/outfit/${outfit.id}`} className="mt-5 block">
            <Button variant="secondary" className="w-full">Open outfit detail</Button>
          </Link>
        </Card>
      </section>
      <OutfitActions />
    </AppShell>
  );
}
