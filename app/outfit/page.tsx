import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitRecommendationClient } from "@/components/outfit/OutfitRecommendationClient";
import { OutfitGeneratingState } from "@/components/outfit/OutfitIntegrationStates";
import { PageHeader } from "@/components/ui/PageHeader";

export default function OutfitPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Looks"
        title="Build today’s look"
        subtitle="Tell FitPick what you need and it will choose from your saved clothes."
      />
      <Suspense fallback={<OutfitGeneratingState />}>
        <OutfitRecommendationClient />
      </Suspense>
    </AppShell>
  );
}
