import Link from "next/link";
import { Gem } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlusStatusClient } from "@/components/plus/PlusStatusClient";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function PlusPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <Gem size={14} aria-hidden="true" />
            MyFitPick Plus
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            More room to plan.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            For days when you want more outfit options, saved looks, and deeper styling support.
          </p>
        </div>
      </header>
      <PlusStatusClient />

      <section className="mt-7">
        <SectionHeader title="Free vs Plus" />
        <Card>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <Chip>Free</Chip>
              <p className="mt-3 leading-6 text-muted">Your wardrobe, daily outfit picks, and a small saved-look library.</p>
            </div>
            <div>
              <Chip active>Plus</Chip>
              <p className="mt-3 leading-6 text-muted">More picks, more saved looks, travel planning, and deeper outfit history.</p>
            </div>
          </div>
        </Card>
      </section>
      <Link href="/profile" className="mt-6 block"><Button variant="ghost" className="w-full">Restore purchase</Button></Link>
    </AppShell>
  );
}
