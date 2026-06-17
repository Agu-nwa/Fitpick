import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { WeatherChip } from "@/components/cards/WeatherChip";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { OccasionCard } from "@/components/occasion/OccasionCard";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { occasions, outfitRecommendations } from "@/lib/mock-data";

export default function HomePage() {
  const shortcuts = occasions.filter((occasion) => ["work", "church", "owambe", "school", "casual", "interview"].includes(occasion.id));
  return (
    <AppShell>
      <PageHeader eyebrow="Today" title="What are you dressing for today?" subtitle="Pick an occasion and FitPick will style your wardrobe." />
      <WeatherChip />

      <section className="mt-7">
        <SectionHeader title="Quick occasions" action={<Link href="/occasion" className="text-xs font-semibold text-cocoa">See all</Link>} />
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((occasion) => (
            <Link key={occasion.id} href="/outfit" className="focus-ring rounded-xl3">
              <OccasionCard occasion={occasion} />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Today's pick preview" />
        <Link href={`/outfit/${outfitRecommendations[0].id}`} className="block rounded-xl3">
          <OutfitCard outfit={outfitRecommendations[0]} />
        </Link>
      </section>

      <section className="mt-7 space-y-4">
        <ProgressCard title="Wardrobe progress" body="Add shoes and native pieces for better outfit picks." progress={68} />
        <Link href="/wardrobe/add"><Button variant="secondary" className="w-full">Quick add clothes</Button></Link>
      </section>
    </AppShell>
  );
}
