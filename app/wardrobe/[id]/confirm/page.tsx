import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeUploadConfirmClient } from "@/components/wardrobe/WardrobeUploadConfirmClient";

export default async function WardrobeConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <PageHeader compact eyebrow="Check details" title="Review item details" subtitle="Confirm or edit what MyFitPick found before saving." />
      <WardrobeUploadConfirmClient uploadId={id} />
    </AppShell>
  );
}
