import { AppShell } from "@/components/layout/AppShell";
import { WardrobeAddClient } from "@/components/wardrobe/WardrobeAddClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AddClothesPage() {
  return (
    <AppShell>
      <PageHeader compact eyebrow="Closet intake" title="Add a closet item" subtitle="Choose a category, add one clear main photo, then review the details." />
      <WardrobeAddClient />
    </AppShell>
  );
}
