"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, ChevronDown, Layers3, Plus, SlidersHorizontal, X } from "lucide-react";
import { WardrobeItemCard } from "@/components/wardrobe/WardrobeItemCard";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeEmptyState,
  WardrobeLoadingState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { Card } from "@/components/ui/Card";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useRevealContent } from "@/hooks/use-reveal-content";
import { useSession } from "@/hooks/use-session";
import { getWardrobe, type WardrobeListData } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  buildWardrobeFacetOptions,
  buildWardrobeFilterIndex,
  clearWardrobeFilters,
  displayFacetLabel,
  filterWardrobeIndex,
  filtersFromSearchParams,
  hasActiveWardrobeFilters,
  wardrobeCategoryFilters,
  wardrobeWornFilters,
  writeFiltersToSearchParams,
  type WardrobeFacetOption,
  type WardrobeFilterState
} from "@/lib/wardrobe/filters";
import type { WardrobeItem, WardrobeSummary } from "@/types/wardrobe";

const emptySummary: WardrobeSummary = {
  totalCount: 0,
  readyCount: 0,
  needsCareCount: 0,
  missingTagsCount: 0,
  countsByCategory: {},
  missingEssentials: []
};

function WardrobeGrid({ items }: { items: WardrobeItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 transition duration-300 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <Link key={item.id} href={`/wardrobe/${item.id}`} className="focus-ring rounded-xl3">
          <WardrobeItemCard item={item} />
        </Link>
      ))}
    </div>
  );
}

type SmartPanel = "color" | "occasion" | "weather" | "worn" | null;

const smartFilters: Array<{ id: Exclude<SmartPanel, null>; label: string }> = [
  { id: "color", label: "Color" },
  { id: "occasion", label: "Occasion" },
  { id: "weather", label: "Weather" },
  { id: "worn", label: "Recently worn" }
];

function chipClass(active?: boolean) {
  return cn(
    "focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition duration-200 active:scale-[0.98]",
    active
      ? "border-olive bg-olive text-canvas shadow-glow"
      : "border-line bg-surface/80 text-muted hover:border-olive/50 hover:text-ink"
  );
}

function labelForOption(key: string, options: WardrobeFacetOption[]) {
  return options.find((option) => option.key === key)?.label || displayFacetLabel(key);
}

function categoryLabel(category: WardrobeFilterState["category"]) {
  return wardrobeCategoryFilters.find((filter) => filter.id === category)?.label || "All";
}

function wornLabel(worn: WardrobeFilterState["worn"]) {
  return wardrobeWornFilters.find((filter) => filter.id === worn)?.label || "";
}

function FilterButton({
  active,
  children,
  onClick,
  controls,
  expanded
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  controls?: string;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={chipClass(active)}
    >
      {children}
    </button>
  );
}

function OptionButton({
  label,
  count,
  active,
  onClick
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "focus-ring flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 text-left text-sm font-semibold transition",
        active ? "border-olive bg-olive/10 text-ink" : "border-line bg-canvas/70 text-ink hover:border-olive/60 hover:bg-white/80"
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? <span className="text-xs text-muted">{count}</span> : null}
    </button>
  );
}

function FilterPanel({
  panel,
  filters,
  colors,
  occasions,
  weather,
  updateFilters
}: {
  panel: SmartPanel;
  filters: WardrobeFilterState;
  colors: WardrobeFacetOption[];
  occasions: WardrobeFacetOption[];
  weather: WardrobeFacetOption[];
  updateFilters: (patch: Partial<WardrobeFilterState>) => void;
}) {
  if (!panel) return null;

  const config =
    panel === "color"
      ? { title: "Choose color", empty: "No colors detected yet.", options: colors, active: filters.color, keyName: "color" as const }
      : panel === "occasion"
        ? { title: "Choose occasion", empty: "No occasions detected yet.", options: occasions, active: filters.occasion, keyName: "occasion" as const }
        : panel === "weather"
          ? { title: "Choose weather", empty: "No weather tags detected yet.", options: weather, active: filters.weather, keyName: "weather" as const }
          : null;

  return (
    <div id="wardrobe-filter-panel">
      <Card className="mt-3 border-olive/20 bg-surface/95 p-4" >
      {panel === "worn" ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Recently worn</p>
            {filters.worn ? (
              <button type="button" onClick={() => updateFilters({ worn: "" })} className="focus-ring rounded-full px-3 py-1 text-xs font-semibold text-muted hover:text-ink">
                Clear
              </button>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {wardrobeWornFilters.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                active={filters.worn === option.id}
                onClick={() => updateFilters({ worn: filters.worn === option.id ? "" : option.id })}
              />
            ))}
          </div>
        </>
      ) : config ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{config.title}</p>
            {config.active ? (
              <button
                type="button"
                onClick={() => updateFilters({ [config.keyName]: "" } as Partial<WardrobeFilterState>)}
                className="focus-ring rounded-full px-3 py-1 text-xs font-semibold text-muted hover:text-ink"
              >
                Clear
              </button>
            ) : null}
          </div>
          {config.options.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {config.options.map((option) => (
                <OptionButton
                  key={option.key}
                  label={option.label}
                  count={option.count}
                  active={config.active === option.key}
                  onClick={() => updateFilters({ [config.keyName]: config.active === option.key ? "" : option.key } as Partial<WardrobeFilterState>)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-line bg-canvas/60 px-3 py-3 text-sm text-muted">{config.empty}</p>
          )}
        </>
      ) : null}
      </Card>
    </div>
  );
}

function ActiveFilterChips({
  filters,
  colors,
  occasions,
  weather,
  updateFilters,
  clearFilters
}: {
  filters: WardrobeFilterState;
  colors: WardrobeFacetOption[];
  occasions: WardrobeFacetOption[];
  weather: WardrobeFacetOption[];
  updateFilters: (patch: Partial<WardrobeFilterState>) => void;
  clearFilters: () => void;
}) {
  const active = [
    filters.category !== "all" ? { key: "category", label: categoryLabel(filters.category), clear: () => updateFilters({ category: "all" }) } : null,
    filters.color ? { key: "color", label: `Color: ${labelForOption(filters.color, colors)}`, clear: () => updateFilters({ color: "" }) } : null,
    filters.occasion ? { key: "occasion", label: `Occasion: ${labelForOption(filters.occasion, occasions)}`, clear: () => updateFilters({ occasion: "" }) } : null,
    filters.weather ? { key: "weather", label: `Weather: ${labelForOption(filters.weather, weather)}`, clear: () => updateFilters({ weather: "" }) } : null,
    filters.worn ? { key: "worn", label: wornLabel(filters.worn), clear: () => updateFilters({ worn: "" }) } : null,
    filters.needsCare ? { key: "care", label: "Needs care", clear: () => updateFilters({ needsCare: false }) } : null
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  if (!active.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active wardrobe filters">
      {active.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.clear}
          className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-full border border-olive/30 bg-olive/10 px-3 text-xs font-semibold text-ink transition hover:border-olive/60"
          aria-label={`Remove ${filter.label} filter`}
        >
          {filter.label}
          <X size={13} aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={clearFilters} className="focus-ring min-h-9 rounded-full px-3 text-xs font-semibold text-muted hover:text-ink">
        Clear all
      </button>
    </div>
  );
}

function FilterToolbar({
  filters,
  colors,
  occasions,
  weather,
  updateFilters,
  clearFilters,
  revealResults
}: {
  filters: WardrobeFilterState;
  colors: WardrobeFacetOption[];
  occasions: WardrobeFacetOption[];
  weather: WardrobeFacetOption[];
  updateFilters: (patch: Partial<WardrobeFilterState>) => void;
  clearFilters: () => void;
  revealResults: () => void;
}) {
  const [panel, setPanel] = useState<SmartPanel>(null);
  const revealContent = useRevealContent();

  function applyFilters(patch: Partial<WardrobeFilterState>) {
    updateFilters(patch);
    revealResults();
  }

  function togglePanel(next: Exclude<SmartPanel, null>) {
    setPanel((current) => current === next ? null : next);
    revealContent(() => document.getElementById("wardrobe-filter-panel"), { delayMs: 90, topOffset: 24, bottomOffset: 136 });
  }

  return (
    <section className="mt-6" aria-label="Wardrobe filters">
      <div className="mobile-scrollbar flex gap-2 overflow-x-auto pb-1">
        {wardrobeCategoryFilters.map((category) => (
          <FilterButton
            key={category.id}
            active={filters.category === category.id}
            onClick={() => {
              setPanel(null);
              applyFilters({ category: category.id });
            }}
          >
            {category.label}
          </FilterButton>
        ))}
      </div>

      <div className="mobile-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {smartFilters.map((filter) => {
          const active =
            (filter.id === "color" && Boolean(filters.color)) ||
            (filter.id === "occasion" && Boolean(filters.occasion)) ||
            (filter.id === "weather" && Boolean(filters.weather)) ||
            (filter.id === "worn" && Boolean(filters.worn));

          return (
            <FilterButton
              key={filter.id}
              active={active}
              controls="wardrobe-filter-panel"
              expanded={panel === filter.id}
              onClick={() => togglePanel(filter.id)}
            >
              {filter.label}
              <ChevronDown size={13} aria-hidden="true" className={cn("transition", panel === filter.id ? "rotate-180" : "")} />
            </FilterButton>
          );
        })}
        <FilterButton active={filters.needsCare} onClick={() => applyFilters({ needsCare: !filters.needsCare })}>
          Needs care
        </FilterButton>
      </div>

      <FilterPanel
        panel={panel}
        filters={filters}
        colors={colors}
        occasions={occasions}
        weather={weather}
        updateFilters={applyFilters}
      />

      <ActiveFilterChips
        filters={filters}
        colors={colors}
        occasions={occasions}
        weather={weather}
        updateFilters={applyFilters}
        clearFilters={() => {
          clearFilters();
          revealResults();
        }}
      />
    </section>
  );
}

function FilteredEmptyState({ filters, onClear }: { filters: WardrobeFilterState; onClear: () => void }) {
  const onlyCategory = filters.category !== "all" && !filters.color && !filters.occasion && !filters.weather && !filters.worn && !filters.needsCare;
  const categoryCopy: Record<string, { title: string; body: string }> = {
    tops: { title: "No tops yet.", body: "Add your first shirt, tee, polo, or blouse." },
    bottoms: { title: "No bottoms yet.", body: "Add your first trouser, jean, skirt, or short." },
    shoes: { title: "No shoes yet.", body: "Add your first sneaker, boot, loafer, or sandal." },
    outerwear: { title: "No outerwear yet.", body: "Add your first jacket or coat." },
    accessories: { title: "No accessories yet.", body: "Add your first bag, belt, jewelry, or finishing piece." }
  };
  const copy = onlyCategory ? categoryCopy[filters.category] : null;

  return (
    <Card className="border-dashed p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cocoa/15 bg-cocoa/10 text-cocoa">
        <SlidersHorizontal size={18} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-ink">{copy?.title || "No pieces match these filters."}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{copy?.body || "Remove a filter or add a piece with these details."}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href="/wardrobe/add" className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-cocoa px-4 text-sm font-semibold text-canvas shadow-glow transition hover:bg-cocoa/90">
          <Plus size={16} aria-hidden="true" />
          Add Piece
        </Link>
        {hasActiveWardrobeFilters(filters) ? (
          <button type="button" onClick={onClear} className="focus-ring min-h-11 rounded-2xl border border-line bg-white/80 px-4 text-sm font-semibold text-ink transition hover:border-olive/60">
            Clear filters
          </button>
        ) : null}
      </div>
    </Card>
  );
}

function SummaryCard({ summary }: { summary: WardrobeSummary }) {
  const progress = summary.totalCount ? Math.min(100, Math.round((summary.readyCount / Math.max(summary.totalCount, 1)) * 100)) : 0;
  const body = summary.missingEssentials.length
    ? summary.missingEssentials.slice(0, 2).join(" ")
    : `${summary.readyCount} ready items. Your wardrobe is set up for stronger outfit picks.`;

  return (
    <div className="mt-7 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
      <ProgressCard title="Wardrobe strength" body={body} progress={progress} />
      <Card className="p-4">
        <div className="grid h-full grid-cols-3 gap-2">
          <div className="rounded-xl2 border border-line bg-canvas/60 p-3">
            <Layers3 size={16} className="text-cocoa" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black text-ink">{summary.totalCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Pieces</p>
          </div>
          <div className="rounded-xl2 border border-success/20 bg-success/10 p-3">
            <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black text-success">{summary.readyCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Ready</p>
          </div>
          <div className="rounded-xl2 border border-warning/20 bg-warning/10 p-3">
            <AlertCircle size={16} className="text-warning" aria-hidden="true" />
            <p className="mt-4 text-2xl font-black text-warning">{summary.missingTagsCount + summary.needsCareCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Review</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function WardrobeListClient() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLElement>(null);
  const revealContent = useRevealContent();
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

  const displaySummary = useMemo(() => wardrobe?.summary || emptySummary, [wardrobe]);
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const items = useMemo(() => wardrobe?.items || [], [wardrobe]);
  const indexedItems = useMemo(() => buildWardrobeFilterIndex(items), [items]);
  const facetOptions = useMemo(() => buildWardrobeFacetOptions(indexedItems), [indexedItems]);
  const filteredItems = useMemo(() => filterWardrobeIndex(indexedItems, filters).map((indexed) => indexed.item), [filters, indexedItems]);
  const hasFilters = hasActiveWardrobeFilters(filters);

  const updateFilters = useCallback((patch: Partial<WardrobeFilterState>) => {
    const next = { ...filters, ...patch };
    const params = writeFiltersToSearchParams(new URLSearchParams(searchParams.toString()), next);
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [filters, pathname, router, searchParams]);

  const clearFilters = useCallback(() => {
    const params = writeFiltersToSearchParams(new URLSearchParams(searchParams.toString()), clearWardrobeFilters());
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const revealResults = useCallback(() => {
    revealContent(resultsRef, { delayMs: 120, topOffset: 24, bottomOffset: 136 });
  }, [revealContent]);

  if (session.status === "loading" || status === "loading" || (session.status === "authenticated" && status === "idle")) {
    return <WardrobeLoadingState />;
  }

  if (session.status === "logged-out") {
    return <WardrobeAuthRequiredState />;
  }

  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <WardrobeBackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadWardrobe} />;
  }

  if (status === "error") {
    return <WardrobeApiErrorState onRetry={loadWardrobe} />;
  }

  if (status === "empty") {
    return (
      <>
        <FilterToolbar
          filters={filters}
          colors={facetOptions.colors}
          occasions={facetOptions.occasions}
          weather={facetOptions.weather}
          updateFilters={updateFilters}
          clearFilters={clearFilters}
          revealResults={revealResults}
        />
        <SummaryCard summary={displaySummary} />
        <section ref={resultsRef} className="mt-10">
          <SectionHeader title="Style archive" eyebrow="All pieces" />
          <WardrobeEmptyState />
        </section>
      </>
    );
  }

  return (
    <>
      <FilterToolbar
        filters={filters}
        colors={facetOptions.colors}
        occasions={facetOptions.occasions}
        weather={facetOptions.weather}
        updateFilters={updateFilters}
        clearFilters={clearFilters}
        revealResults={revealResults}
      />
      <SummaryCard summary={displaySummary} />
      <section ref={resultsRef} className="mt-10">
        <SectionHeader
          title="Style archive"
          eyebrow={hasFilters ? `${filteredItems.length} of ${items.length} pieces` : `${items.length} pieces`}
        />
        {filteredItems.length ? <WardrobeGrid items={filteredItems} /> : <FilteredEmptyState filters={filters} onClear={clearFilters} />}
      </section>
    </>
  );
}
