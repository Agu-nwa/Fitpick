"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { OutfitCard } from "@/components/cards/OutfitCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import { getLooks, type LooksData } from "@/lib/api-client";
import { emptyStates, savedLooks, wornLooks } from "@/lib/mock-data";

const tabs = ["Saved", "Worn", "Favorites"] as const;

function BackendLooks({ data, tab }: { data: LooksData; tab: (typeof tabs)[number] }) {
  const saved = tab === "Favorites" ? data.favorites : data.saved;
  const showSaved = tab === "Saved" || tab === "Favorites";
  const showWorn = tab === "Worn";

  if (showSaved && !saved.length) return <EmptyState {...emptyStates.looks} />;
  if (showWorn && !data.worn.length) return <EmptyState title="No worn looks yet" body="Mark an outfit as worn and it will appear here." cta="Pick outfit" />;

  return (
    <div className="space-y-3">
      {showSaved ? saved.map((look) => (
        <Link key={look.id} href={`/outfit/${look.outfitId}/preview`} className="block rounded-xl3">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-ink">{look.title}</span>
                <span className="mt-1 block text-xs text-muted">{look.occasion} · {look.favorite ? "Favorite" : "Saved"}</span>
              </span>
              <Button variant="secondary">View full look</Button>
            </div>
          </Card>
        </Link>
      )) : null}
      {showWorn ? data.worn.map((look) => (
        <Link key={look.id} href={`/outfit/${look.outfitId}/preview`} className="block rounded-xl3">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-ink">{look.occasion} outfit</span>
                <span className="mt-1 block text-xs text-muted">{look.wornAt ? new Date(look.wornAt).toLocaleDateString() : "Worn"} {look.rating ? `· ${look.rating}` : ""}</span>
              </span>
              {look.repeatWarning ? <Chip>{look.repeatWarning}</Chip> : <Button variant="secondary">View full look</Button>}
            </div>
          </Card>
        </Link>
      )) : null}
    </div>
  );
}

function MockLooks() {
  return (
    <div className="space-y-4">
      {savedLooks.map((look) => (
        <Link key={look.id} href={`/outfit/${look.id}/preview`} className="block rounded-xl3">
          <OutfitCard outfit={look} />
        </Link>
      ))}
      {wornLooks.slice(0, 1).map((look) => (
        <Card key={`${look.id}-${look.wornOn}`} className="p-4">
          <h3 className="text-sm font-semibold text-ink">{look.title}</h3>
          <p className="mt-1 text-xs text-muted">Worn on {look.wornOn}</p>
        </Card>
      ))}
    </div>
  );
}

export function LooksClient() {
  const session = useSession();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Saved");
  const [data, setData] = useState<LooksData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "error">("idle");

  const loadLooks = useCallback(async () => {
    setStatus("loading");
    const result = await getLooks();
    if (result.ok) {
      setData(result.data);
      setStatus("idle");
      return;
    }
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadLooks();
  }, [loadLooks, session.status]);

  if (session.status === "loading" || status === "loading") return <LoadingCard title="Loading looks" />;

  return (
    <>
      {session.status === "logged-out" ? <AuthRequiredState /> : null}
      {session.status === "backend-unavailable" || status === "unavailable" ? <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadLooks} /> : null}
      <div className="mb-6 mt-5 flex gap-2">
        {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)}><Chip active={tab === item}>{item}{data ? ` ${data.counts[item.toLowerCase() as "saved" | "worn" | "favorites"]}` : ""}</Chip></button>)}
      </div>
      <section>
        <SectionHeader title={tab} />
        {data && session.status === "authenticated" ? <BackendLooks data={data} tab={tab} /> : <MockLooks />}
      </section>
    </>
  );
}
