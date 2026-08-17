import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeUploadConfirmClient } from "@/components/wardrobe/WardrobeUploadConfirmClient";

export default async function WardrobeConfirmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ batchId?: string }> }) {
  const { id } = await params;
  const { batchId } = await searchParams;

  return (
    <AppShell>
      <PageHeader compact eyebrow="Check details" title="Review item details" subtitle="Confirm or edit what MyFitPick found before saving." />
      <WardrobeUploadConfirmClient uploadId={id} batchId={batchId || ""} />
    </AppShell>
  );
}
