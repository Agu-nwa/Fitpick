import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeBatchReviewClient } from "@/components/wardrobe/WardrobeBatchReviewClient";

export default async function WardrobeBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppShell><PageHeader compact eyebrow="Batch review" title="Check every item" subtitle="Confirm each category and detail before your stylist can use it." /><WardrobeBatchReviewClient batchId={id} /></AppShell>;
}
