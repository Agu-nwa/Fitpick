import { AppShell } from "@/components/layout/AppShell";
import { OutfitDetailClient } from "@/components/outfit/OutfitDetailClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { outfitRecommendations } from "@/lib/mock-data";

export default async function OutfitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mockOutfit = outfitRecommendations.find((entry) => entry.id === id);

  return (
    <AppShell>
      <PageHeader eyebrow="Outfit detail" title={mockOutfit?.title || "Outfit detail"} subtitle={mockOutfit?.summary || "Review outfit items and styling notes."} />
      <OutfitDetailClient id={id} mockOutfit={mockOutfit} />
    </AppShell>
  );
}
