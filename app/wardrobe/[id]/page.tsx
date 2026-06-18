import { AppShell } from "@/components/layout/AppShell";
import { WardrobeDetailClient } from "@/components/wardrobe/WardrobeDetailClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { wardrobeItems } from "@/lib/mock-data";

export default function WardrobeItemDetailPage({ params }: { params: { id: string } }) {
  const mockItem = wardrobeItems.find((entry) => entry.id === params.id);

  return (
    <AppShell>
      <PageHeader eyebrow="Wardrobe item" title={mockItem?.name || "Wardrobe item"} subtitle="Review tags, readiness, and outfit matching details." />
      <WardrobeDetailClient id={params.id} mockItem={mockItem} />
    </AppShell>
  );
}
