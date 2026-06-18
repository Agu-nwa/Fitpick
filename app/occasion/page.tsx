import { AppShell } from "@/components/layout/AppShell";
import { OccasionPickerClient } from "@/components/occasion/OccasionPickerClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OccasionPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Occasion" title="Where are you going?" subtitle="Choose the occasion you are dressing for." />
      <OccasionPickerClient />
    </AppShell>
  );
}
