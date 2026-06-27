import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitRecommendationClient } from "@/components/outfit/OutfitRecommendationClient";
import { OutfitGeneratingState } from "@/components/outfit/OutfitIntegrationStates";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OutfitPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Outfit engine"
        title="Build today’s look"
        subtitle="Generate a wardrobe-grounded outfit with occasion, weather, Style DNA, and fashion memory."
      />
      <Suspense fallback={<OutfitGeneratingState />}>
        <OutfitRecommendationClient />
      </Suspense>
    </AppShell>
  );
}
