import { AppShell } from "@/components/layout/AppShell";
import { OutfitDetailClient } from "@/components/outfit/OutfitDetailClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { outfitRecommendations } from "@/lib/mock-data";

export default function OutfitDetailPage({ params }: { params: { id: string } }) {
  const mockOutfit = outfitRecommendations.find((entry) => entry.id === params.id);

  return (
    <AppShell>
      <PageHeader eyebrow="Outfit detail" title={mockOutfit?.title || "Outfit detail"} subtitle={mockOutfit?.summary || "Review outfit items and styling notes."} />
      <OutfitDetailClient id={params.id} mockOutfit={mockOutfit} />
    </AppShell>
  );
}
