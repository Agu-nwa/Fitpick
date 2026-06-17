import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { WardrobeItemCard } from "@/components/wardrobe/WardrobeItemCard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { emptyStates, wardrobeItems } from "@/lib/mock-data";

const categories = ["All", "Tops", "Bottoms", "Shoes", "Native", "Accessories"];
const filters = ["Color", "Occasion", "Weather", "Recently worn", "Needs care"];

export default function WardrobePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Wardrobe" title="Your wardrobe" subtitle="Add, tag, and manage the clothes you own." />
      <Link href="/wardrobe/add"><Button className="mb-5 w-full">Add clothes</Button></Link>

      <div className="mobile-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category, index) => <Chip key={category} active={index === 0}>{category}</Chip>)}
      </div>
      <div className="mobile-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => <Chip key={filter}>{filter}</Chip>)}
      </div>

      <ProgressCard title="Wardrobe strength" body="32 items tagged. Add shoes and accessories for stronger outfit picks." progress={68} />

      <section className="mt-7">
        <SectionHeader title="All items" />
        <div className="grid grid-cols-2 gap-3">
          {wardrobeItems.map((item) => (
            <Link key={item.id} href={`/wardrobe/${item.id}`} className="focus-ring rounded-xl3">
              <WardrobeItemCard item={item} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Empty state sample" />
        <EmptyState {...emptyStates.shoes} />
      </section>
    </AppShell>
  );
}
