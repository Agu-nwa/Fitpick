import { AppShell } from "@/components/layout/AppShell";
import { WardrobeDetailClient } from "@/components/wardrobe/WardrobeDetailClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function WardrobeItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <PageHeader eyebrow="Wardrobe item" title="Wardrobe item" subtitle="Review tags, readiness, and outfit matching details." />
      <WardrobeDetailClient id={id} />
    </AppShell>
  );
}
