"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Heart, Sparkles } from "lucide-react";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSession } from "@/hooks/use-session";
import { getSavedOutfits } from "@/lib/api-client";
import type { OutfitRecommendation } from "@/types/outfit";

export function SavedLooksClient() {
  const session = useSession();
  const [looks, setLooks] = useState<OutfitRecommendation[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "unavailable" | "error">("idle");

  const loadLooks = useCallback(async () => {
    setStatus("loading");
    const result = await getSavedOutfits();
    if (result.ok) {
      setLooks(result.data.outfits);
      setStatus(result.data.outfits.length ? "ready" : "empty");
      return;
    }
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadLooks();
  }, [loadLooks, session.status]);

  if (session.status === "loading" || status === "loading" || (session.status === "authenticated" && status === "idle")) return <LoadingCard title="Loading saved looks" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || status === "unavailable") return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadLooks} />;
  if (status === "error") return <ApiErrorState title="Saved looks unavailable" message="MyFitPick could not load your saved looks right now." onRetry={loadLooks} />;
  if (status === "empty") return <EmptyState title="Save your first look." body="When a recommendation feels right, save it here so you can wear it again or create a variation later." cta="Create a look" href="/stylist/create-look" />;

  return (
    <section className="mt-8" aria-labelledby="saved-looks-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa"><Heart size={14} aria-hidden="true" />Your collection</p>
          <h2 id="saved-looks-title" className="font-editorial mt-2 text-3xl font-semibold text-ink sm:text-4xl">Wear it again—or make it new.</h2>
        </div>
        <Link href="/stylist/create-look" className="hidden sm:block"><Button variant="secondary"><Sparkles size={16} aria-hidden="true" />Create another</Button></Link>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {looks.map((look) => (
          <Link key={look.id} href={`/outfit/${look.id}`} className="focus-ring block rounded-xl3" aria-label={`Open ${look.title}`}>
            <OutfitCard outfit={look} />
          </Link>
        ))}
      </div>
    </section>
  );
}
