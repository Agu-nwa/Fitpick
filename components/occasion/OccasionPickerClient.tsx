"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { OccasionCard } from "@/components/occasion/OccasionCard";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CTABar } from "@/components/ui/CTABar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import { createCustomOccasion, getOccasions } from "@/lib/api-client";
import { occasions as mockOccasions } from "@/lib/mock-data";
import type { Formality, Occasion, OccasionGroup } from "@/types/occasion";

const formalityLevels: Array<{ value: Formality; label: string }> = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "polished", label: "Polished" },
  { value: "formal", label: "Formal" }
];

const groupOptions: Array<{ value: OccasionGroup; label: string }> = [
  { value: "everyday", label: "Everyday" },
  { value: "formal", label: "Formal" },
  { value: "social", label: "Social" },
  { value: "cultural", label: "Cultural" },
  { value: "weather", label: "Weather" }
];

const inputClass = "focus-ring min-h-11 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none";

function normalizeOccasion(raw: any): Occasion {
  return {
    id: String(raw.id || raw._id),
    _id: raw._id ? String(raw._id) : undefined,
    name: raw.name,
    group: raw.group || "everyday",
    formality: raw.formality || "balanced",
    description: raw.description || `${raw.name} outfit context.`,
    icon: raw.icon || (raw.group === "cultural" ? "◇" : raw.group === "formal" ? "▣" : raw.group === "weather" ? "☼" : "○"),
    isGlobal: raw.isGlobal
  };
}

export function OccasionPickerClient() {
  const session = useSession();
  const [items, setItems] = useState<Occasion[]>(mockOccasions);
  const [selected, setSelected] = useState(mockOccasions[0]?.id || "");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState<OccasionGroup>("social");
  const [customFormality, setCustomFormality] = useState<Formality>("balanced");
  const [message, setMessage] = useState("");

  const loadOccasions = useCallback(async () => {
    setStatus("loading");
    const result = await getOccasions();
    if (result.ok) {
      const normalized = result.data.occasions.map(normalizeOccasion);
      const next = normalized.length ? normalized : mockOccasions;
      setItems(next);
      setSelected((current) => next.some((occasion) => occasion.id === current) ? current : next[0]?.id || "");
      setStatus("ready");
      return;
    }
    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadOccasions();
  }, [loadOccasions, session.status]);

  async function handleCreateCustom() {
    if (!customName.trim()) {
      setMessage("Name the occasion first.");
      return;
    }

    const result = await createCustomOccasion({
      name: customName.trim(),
      group: customGroup,
      formality: customFormality
    });

    if (result.ok) {
      const occasion = normalizeOccasion(result.data.occasion);
      setItems((current) => [occasion, ...current]);
      setSelected(occasion.id);
      setCustomName("");
      setMessage("Custom occasion added.");
      return;
    }

    setMessage("We could not add this occasion right now.");
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((occasion) => occasion.name.toLowerCase().includes(term) || occasion.group.toLowerCase().includes(term));
  }, [items, search]);
  const selectedOccasion = items.find((occasion) => occasion.id === selected) || items[0];
  const selectedFormality = selectedOccasion?.formality || customFormality;
  const href = selectedOccasion
    ? `/outfit?occasionId=${encodeURIComponent(selectedOccasion._id || "")}&occasionName=${encodeURIComponent(selectedOccasion.name)}&formality=${selectedFormality}`
    : "/outfit";

  if (session.status === "loading" || status === "loading") return <LoadingCard title="Loading occasions" />;

  return (
    <>
      {session.status === "logged-out" ? <AuthRequiredState /> : null}
      {session.status === "backend-unavailable" || status === "unavailable" ? <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadOccasions} /> : null}

      <label className="mb-5 mt-5 block">
        <span className="sr-only">Search occasions</span>
        <input
          className="focus-ring min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted"
          placeholder="Search occasions"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <section>
        <SectionHeader title="Choose occasion" />
        {filtered.length ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((occasion) => (
              <OccasionCard key={occasion.id} occasion={occasion} selected={occasion.id === selected} onClick={() => setSelected(occasion.id)} />
            ))}
          </div>
        ) : (
          <Card className="p-4">
            <p className="text-sm font-semibold text-ink">No occasion found</p>
            <p className="mt-2 text-xs leading-5 text-muted">Try another search or create a custom occasion.</p>
          </Card>
        )}
      </section>

      <section className="mt-7">
        <SectionHeader title="Custom occasion" />
        <Card className="space-y-3">
          <label className="block text-xs font-semibold text-ink">
            Occasion name
            <input className={inputClass} value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Birthday dinner" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-ink">
              Group
              <select className={inputClass} value={customGroup} onChange={(event) => setCustomGroup(event.target.value as OccasionGroup)}>
                {groupOptions.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-ink">
              Formality
              <select className={inputClass} value={customFormality} onChange={(event) => setCustomFormality(event.target.value as Formality)}>
                {formalityLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
            </label>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => void handleCreateCustom()} disabled={session.status !== "authenticated"}>
            Create custom occasion
          </Button>
          {message ? <p className="rounded-2xl bg-cocoa/10 px-3 py-2 text-xs font-semibold text-ink">{message}</p> : null}
        </Card>
      </section>

      {selectedOccasion ? (
        <section className="mt-7">
          <SectionHeader title="Context" eyebrow={selectedOccasion.name} />
          <Card>
            <p className="mb-4 text-sm leading-6 text-muted">Choose how dressed up this should feel.</p>
            <div className="flex flex-wrap gap-2">
              {formalityLevels.map((level) => <Chip key={level.value} active={level.value === selectedFormality}>{level.label}</Chip>)}
            </div>
            <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm text-muted">Use today&apos;s weather: <strong className="text-ink">On</strong></div>
          </Card>
        </section>
      ) : null}

      <CTABar className="mt-6">
        <Link href={href}>
          <Button className="w-full">Find my outfit</Button>
        </Link>
      </CTABar>
    </>
  );
}
