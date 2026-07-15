import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeUploadConfirmClient } from "@/components/wardrobe/WardrobeUploadConfirmClient";

export default async function WardrobeConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <PageHeader eyebrow="Check details" title="MyFitPick found these details" subtitle="Please check them and change anything that looks wrong." />
      <WardrobeUploadConfirmClient uploadId={id} />
    </AppShell>
  );
}
