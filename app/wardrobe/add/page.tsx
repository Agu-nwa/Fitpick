import { AppShell } from "@/components/layout/AppShell";
import { WardrobeAddClient } from "@/components/wardrobe/WardrobeAddClient";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AddClothesPage() {
  return (
    <AppShell>
      <PageHeader compact eyebrow="Closet intake" title="Add a closet item" subtitle="Choose a category, add one clear main photo, then review the details." />
      <div className="mt-5 rounded-2xl border border-line bg-surfaceWarm p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div><p className="text-sm font-semibold text-ink">Adding several different items?</p><p className="mt-1 text-xs leading-5 text-muted">Upload up to 10 photos and let MyFitPick prepare each item separately.</p></div>
        <Link href="/wardrobe/bulk-upload"><Button variant="secondary" className="mt-3 w-full sm:mt-0 sm:w-auto">Add several items</Button></Link>
      </div>
      <WardrobeAddClient />
    </AppShell>
  );
}
