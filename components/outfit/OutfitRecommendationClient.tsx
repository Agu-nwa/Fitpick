"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { OutfitResult } from "@/components/outfit/OutfitResult";
import {
  NotEnoughWardrobeItemsState,
  OutfitAuthRequiredState,
  OutfitBackendUnavailableState,
  OutfitGeneratingState,
  PremiumLimitState
} from "@/components/outfit/OutfitIntegrationStates";
import { useSession } from "@/hooks/use-session";
import { createRecommendation } from "@/lib/api-client";
import { outfitRecommendations } from "@/lib/mock-data";
import type { OutfitRecommendation } from "@/types/outfit";

const styleDirections = [
  { value: "polished", label: "Polished" },
  { value: "comfortable", label: "Comfortable" },
  { value: "native", label: "Native touch" },
  { value: "weather-safe", label: "Weather-safe" }
];

export function OutfitRecommendationClient() {
  const searchParams = useSearchParams();
  const session = useSession();
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "not-enough" | "premium" | "error">("idle");
  const [styleDirection, setStyleDirection] = useState("polished");
  const [weatherContext, setWeatherContext] = useState("indoor");
  const fallback = outfitRecommendations[0];

  const requestBody = useMemo(() => {
    const occasionId = searchParams.get("occasionId") || "";
    const occasionName = searchParams.get("occasionName") || "Work";
    const formality = searchParams.get("formality") || "balanced";

    return {
      ...(occasionId ? { occasionId } : {}),
      occasionName,
      formality,
      weatherContext,
      styleDirection
    };
  }, [searchParams, styleDirection, weatherContext]);

  async function handleGenerate() {
    setStatus("loading");
    const result = await createRecommendation(requestBody);

    if (result.ok) {
      setOutfit(result.data.outfit);
      setStatus("idle");
      return;
    }

    if (result.error.code === "UNAUTHORIZED") setStatus("idle");
    else if (result.error.code === "PLUS_REQUIRED") setStatus("premium");
    else if (result.error.code === "BAD_REQUEST") setStatus("not-enough");
    else if (result.error.code === "INTERNAL_ERROR") setStatus("unavailable");
    else setStatus("error");
  }

  if (session.status === "loading" || status === "loading") return <OutfitGeneratingState />;

  return (
    <>
      {session.status === "logged-out" ? <OutfitAuthRequiredState /> : null}
      {session.status === "backend-unavailable" || status === "unavailable" ? <OutfitBackendUnavailableState onRetry={session.refresh} /> : null}
      {status === "not-enough" ? <NotEnoughWardrobeItemsState /> : null}
      {status === "premium" ? <PremiumLimitState /> : null}

      <section className="mb-7">
        <SectionHeader title="Outfit request" eyebrow={String(requestBody.occasionName)} />
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Build from verified wardrobe items</p>
            <Badge tone="premium">Owned items only</Badge>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-ink">Style direction</p>
            <div className="flex flex-wrap gap-2">
              {styleDirections.map((direction) => (
                <button key={direction.value} type="button" onClick={() => setStyleDirection(direction.value)}>
                  <Chip active={styleDirection === direction.value}>{direction.label}</Chip>
                </button>
              ))}
            </div>
          </div>
          <FieldGroup label="Weather context" htmlFor="weather-context">
            <input
              id="weather-context"
              className="focus-ring mt-1 min-h-11 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink"
              value={weatherContext}
              onChange={(event) => setWeatherContext(event.target.value)}
              placeholder="hot, rainy, indoor"
            />
          </FieldGroup>
          <Button className="w-full" onClick={() => void handleGenerate()} disabled={session.status !== "authenticated"}>
            Generate outfit
          </Button>
          <Link href="/occasion" className="block text-center text-sm font-semibold text-cocoa">Change occasion</Link>
        </Card>
      </section>

      <OutfitResult outfit={outfit || fallback} canSwap={Boolean(outfit)} onOutfitChange={setOutfit} />
    </>
  );
}
