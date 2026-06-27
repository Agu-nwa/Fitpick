import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { WardrobeListClient } from "@/components/wardrobe/WardrobeListClient";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";

const categories = ["All", "Tops", "Bottoms", "Shoes", "Native", "Accessories"];
const filters = ["Color", "Occasion", "Weather", "Recently worn", "Needs care"];

export default function WardrobePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Wardrobe" title="Your verified wardrobe" subtitle="Manage the pieces FitPick can confidently style from." />
      <Link href="/wardrobe/add"><Button className="mb-5 w-full">Add garment intelligence</Button></Link>

      <div className="mobile-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category, index) => <Chip key={category} active={index === 0}>{category}</Chip>)}
      </div>
      <div className="mobile-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => <Chip key={filter}>{filter}</Chip>)}
      </div>

      <WardrobeListClient />
    </AppShell>
  );
}
