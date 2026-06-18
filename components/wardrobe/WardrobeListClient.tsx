"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WardrobeItemCard } from "@/components/wardrobe/WardrobeItemCard";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeEmptyState,
  WardrobeLoadingState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import { getWardrobe, type WardrobeListData } from "@/lib/api-client";
import { wardrobeItems } from "@/lib/mock-data";
import type { WardrobeItem, WardrobeSummary } from "@/types/wardrobe";

const mockSummary: WardrobeSummary = {
  totalCount: wardrobeItems.length,
  readyCount: wardrobeItems.filter((item) => item.condition === "ready").length,
  needsCareCount: wardrobeItems.filter((item) => item.condition === "needs-care").length,
  missingTagsCount: wardrobeItems.filter((item) => item.condition === "missing-tags").length,
  countsByCategory: wardrobeItems.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {}),
  missingEssentials: []
};

function WardrobeGrid({ items }: { items: WardrobeItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Link key={item.id} href={`/wardrobe/${item.id}`} className="focus-ring rounded-xl3">
          <WardrobeItemCard item={item} />
        </Link>
      ))}
    </div>
  );
}

function SummaryCard({ summary }: { summary: WardrobeSummary }) {
  const progress = summary.totalCount ? Math.min(100, Math.round((summary.readyCount / Math.max(summary.totalCount, 1)) * 100)) : 0;
  const body = summary.missingEssentials.length
    ? summary.missingEssentials.slice(0, 2).join(" ")
    : `${summary.readyCount} ready items. Your wardrobe is set up for stronger outfit picks.`;

  return (
    <div className="space-y-3">
      <ProgressCard title="Wardrobe strength" body={body} progress={progress} />
      <Card className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-ink">{summary.totalCount}</p>
            <p className="text-[11px] text-muted">Items</p>
          </div>
          <div>
            <p className="text-lg font-bold text-success">{summary.readyCount}</p>
            <p className="text-[11px] text-muted">Ready</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warning">{summary.missingTagsCount + summary.needsCareCount}</p>
            <p className="text-[11px] text-muted">Review</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MockPreview({ title = "Wardrobe preview" }: { title?: string }) {
  return (
    <section className="mt-7">
      <SectionHeader title={title} />
      <WardrobeGrid items={wardrobeItems.slice(0, 6)} />
    </section>
  );
}

export function WardrobeListClient() {
  const session = useSession();
  const [wardrobe, setWardrobe] = useState<WardrobeListData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "unavailable" | "error">("idle");

  const loadWardrobe = useCallback(async () => {
    setStatus("loading");
    const result = await getWardrobe();
    if (result.ok) {
      setWardrobe(result.data);
      setStatus(result.data.items.length ? "ready" : "empty");
      return;
    }

    setWardrobe(null);
    setStatus(result.error.code === "UNAUTHORIZED" ? "idle" : result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadWardrobe();
  }, [loadWardrobe, session.status]);

  const displaySummary = useMemo(() => wardrobe?.summary || mockSummary, [wardrobe]);

  if (session.status === "loading" || status === "loading") return <WardrobeLoadingState />;

  if (session.status === "logged-out") {
    return (
      <>
        <WardrobeAuthRequiredState />
        <MockPreview />
      </>
    );
  }

  if (session.status === "backend-unavailable" || status === "unavailable") {
    return (
      <>
        <WardrobeBackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadWardrobe} />
        <MockPreview />
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <WardrobeApiErrorState onRetry={loadWardrobe} />
        <MockPreview />
      </>
    );
  }

  if (status === "empty") {
    return (
      <>
        <SummaryCard summary={displaySummary} />
        <section className="mt-7">
          <SectionHeader title="All items" />
          <WardrobeEmptyState />
        </section>
        <MockPreview title="Example wardrobe cards" />
      </>
    );
  }

  return (
    <>
      <SummaryCard summary={displaySummary} />
      <section className="mt-7">
        <SectionHeader title="All items" />
        <WardrobeGrid items={wardrobe?.items || wardrobeItems} />
      </section>
    </>
  );
}
