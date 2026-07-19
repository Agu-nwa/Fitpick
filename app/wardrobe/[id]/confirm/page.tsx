import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeUploadConfirmClient } from "@/components/wardrobe/WardrobeUploadConfirmClient";

export default async function WardrobeConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <PageHeader eyebrow="Check details" title="Review your garment intelligence" subtitle="Confirm what MyFitPick detected before this piece enters your closet." />
      <WardrobeUploadConfirmClient uploadId={id} />
    </AppShell>
  );
}
