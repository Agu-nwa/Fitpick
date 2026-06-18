import { AppShell } from "@/components/layout/AppShell";
import { PreferencesClient } from "@/components/profile/PreferencesClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PreferencesPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Style profile" title="Style preferences" subtitle="Help FitPick understand what feels right for you." />
      <PreferencesClient />
    </AppShell>
  );
}
