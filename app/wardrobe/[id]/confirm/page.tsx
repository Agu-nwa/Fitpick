import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { WardrobeUploadConfirmClient } from "@/components/wardrobe/WardrobeUploadConfirmClient";

export default function WardrobeConfirmPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <PageHeader eyebrow="Check details" title="FitPick found these details" subtitle="Please check them and change anything that looks wrong." />
      <WardrobeUploadConfirmClient uploadId={params.id} />
    </AppShell>
  );
}
