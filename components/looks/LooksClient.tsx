"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Heart, Shirt, Sparkles } from "lucide-react";
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
    <div className="grid gap-3 lg:grid-cols-2">
      {showSaved ? saved.map((look) => (
        <Link key={look.id} href={`/outfit/${look.outfitId}/preview`} className="focus-ring group block rounded-xl3">
          <Card className="min-h-44 overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10 p-5">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-cocoa text-canvas">
                  {look.favorite ? <Heart size={18} aria-hidden="true" /> : <Shirt size={18} aria-hidden="true" />}
                </span>
                <span className="rounded-full border border-line bg-canvas/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  {look.favorite ? "Favorite" : "Saved"}
                </span>
              </div>
              <div className="mt-auto pt-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">{look.occasion}</p>
                <h3 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">{look.title}</h3>
                <span className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted transition group-hover:text-cocoa">
                  View full look
                  <ArrowUpRight size={15} className="transition group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Card>
        </Link>
      )) : null}
      {showWorn ? data.worn.map((look) => (
        <Link key={look.id} href={`/outfit/${look.outfitId}/preview`} className="focus-ring group block rounded-xl3">
          <Card className="min-h-44 overflow-hidden p-5">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-olive/20 text-olive">
                  <CalendarCheck size={18} aria-hidden="true" />
                </span>
                {look.repeatWarning ? <Chip>{look.repeatWarning}</Chip> : <Chip active>Worn</Chip>}
              </div>
              <div className="mt-auto pt-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">{look.wornAt ? new Date(look.wornAt).toLocaleDateString() : "Worn"}</p>
                <h3 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">{look.occasion} outfit</h3>
                <p className="mt-2 text-sm text-muted">{look.rating || "Style memory"}</p>
              </div>
            </div>
          </Card>
        </Link>
      )) : null}
    </div>
  );
}

function MockLooks() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {savedLooks.map((look) => (
        <Link key={look.id} href={`/outfit/${look.id}/preview`} className="focus-ring block rounded-xl3">
          <OutfitCard outfit={look} />
        </Link>
      ))}
      {wornLooks.slice(0, 1).map((look) => (
        <Card key={`${look.id}-${look.wornOn}`} className="min-h-44 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">Worn on {look.wornOn}</p>
          <h3 className="font-editorial mt-2 text-3xl font-semibold leading-none text-ink">{look.title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted">A saved style memory from your closet.</p>
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
      <div className="mobile-scrollbar mb-6 mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)}><Chip active={tab === item}>{item}{data ? ` ${data.counts[item.toLowerCase() as "saved" | "worn" | "favorites"]}` : ""}</Chip></button>)}
      </div>
      <section>
        <SectionHeader title={tab === "Saved" ? "Saved edits" : tab === "Worn" ? "Style history" : "Favorite looks"} eyebrow="Lookbook" />
        {data && session.status === "authenticated" ? <BackendLooks data={data} tab={tab} /> : <MockLooks />}
      </section>
    </>
  );
}
