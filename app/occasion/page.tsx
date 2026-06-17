"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { OccasionCard } from "@/components/occasion/OccasionCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CTABar } from "@/components/ui/CTABar";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { occasions } from "@/lib/mock-data";

const formality = ["Relaxed", "Balanced", "Polished", "Formal"];

export default function OccasionPage() {
  const [selected, setSelected] = useState("work");
  const selectedOccasion = useMemo(() => occasions.find((occasion) => occasion.id === selected), [selected]);

  return (
    <AppShell>
      <PageHeader eyebrow="Occasion" title="Where are you going?" subtitle="Choose the occasion you are dressing for." />
      <label className="mb-5 block">
        <span className="sr-only">Search occasions</span>
        <input
          className="focus-ring min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-sm text-ink placeholder:text-muted"
          placeholder="Search occasions"
        />
      </label>

      <section>
        <SectionHeader title="Choose occasion" />
        <div className="grid grid-cols-2 gap-3">
          {occasions.map((occasion) => (
            <OccasionCard key={occasion.id} occasion={occasion} selected={occasion.id === selected} onClick={() => setSelected(occasion.id)} />
          ))}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title="Custom occasion" />
        <Card>
          <h3 className="text-sm font-semibold text-ink">Create custom occasion</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Example: birthday dinner, office party, family visit.</p>
          <Button variant="secondary" className="mt-4 w-full">Create custom occasion</Button>
        </Card>
      </section>

      {selectedOccasion ? (
        <section className="mt-7">
          <SectionHeader title="Context" eyebrow={selectedOccasion.name} />
          <Card>
            <p className="mb-4 text-sm leading-6 text-muted">Choose how dressed up this should feel.</p>
            <div className="flex flex-wrap gap-2">
              {formality.map((level) => <Chip key={level} active={level.toLowerCase() === selectedOccasion.formality}>{level}</Chip>)}
            </div>
            <div className="mt-5 rounded-2xl bg-canvas p-4 text-sm text-muted">Use today's weather: <strong className="text-ink">On</strong></div>
          </Card>
        </section>
      ) : null}

      <CTABar className="mt-6">
        <Link href="/outfit"><Button className="w-full">Find my outfit</Button></Link>
      </CTABar>
    </AppShell>
  );
}
