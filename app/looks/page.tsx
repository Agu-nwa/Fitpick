import { AppShell } from "@/components/layout/AppShell";
import { LooksClient } from "@/components/looks/LooksClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function LooksPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Looks" title="Your looks" subtitle="Saved outfits and outfits you have worn." />
      <LooksClient />
    </AppShell>
  );
}
