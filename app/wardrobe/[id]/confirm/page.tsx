import { AppShell } from "@/components/layout/AppShell";
import { WardrobeUploadConfirmClient } from "@/components/wardrobe/WardrobeUploadConfirmClient";

export default async function WardrobeConfirmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ batchId?: string }> }) {
  const { id } = await params;
  const { batchId } = await searchParams;

  return (
    <AppShell>
      <WardrobeUploadConfirmClient uploadId={id} batchId={batchId || ""} />
    </AppShell>
  );
}
