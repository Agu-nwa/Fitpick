import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { OutfitRecommendationClient } from "@/components/outfit/OutfitRecommendationClient";
import { OutfitGeneratingState } from "@/components/outfit/OutfitIntegrationStates";

export default function OutfitPage() {
  return (
    <AppShell>
      <Suspense fallback={<OutfitGeneratingState />}>
        <OutfitRecommendationClient />
      </Suspense>
    </AppShell>
  );
}
