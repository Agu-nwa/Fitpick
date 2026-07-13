import { AppShell } from "@/components/layout/AppShell";
import { WardrobeDetailClient } from "@/components/wardrobe/WardrobeDetailClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { wardrobeItems } from "@/lib/mock-data";

export default async function WardrobeItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mockItem = wardrobeItems.find((entry) => entry.id === id);

  return (
    <AppShell>
      <PageHeader eyebrow="Wardrobe item" title={mockItem?.name || "Wardrobe item"} subtitle="Review tags, readiness, and outfit matching details." />
      <WardrobeDetailClient id={id} mockItem={mockItem} />
    </AppShell>
  );
}
