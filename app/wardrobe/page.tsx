import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WardrobeListClient } from "@/components/wardrobe/WardrobeListClient";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

const categories = ["All", "Tops", "Bottoms", "Shoes", "Native", "Accessories"];
const filters = ["Color", "Occasion", "Weather", "Recently worn", "Needs care"];

export default function WardrobePage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-56 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-64 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <Sparkles size={14} aria-hidden="true" />
              Curated wardrobe
            </p>
            <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
              Your digital closet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Every saved piece becomes styling material for outfits, weather-aware picks, and virtual try-on previews.
            </p>
          </div>
          <Link href="/wardrobe/add" className="shrink-0">
            <Button className="w-full rounded-full sm:w-auto">
              <Plus size={18} aria-hidden="true" />
              Add a piece
            </Button>
          </Link>
        </div>
      </header>

      <div className="mobile-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category, index) => <Chip key={category} active={index === 0}>{category}</Chip>)}
      </div>
      <div className="mobile-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => <Chip key={filter}>{filter}</Chip>)}
      </div>

      <WardrobeListClient />
    </AppShell>
  );
}
