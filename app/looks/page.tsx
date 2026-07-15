import Link from "next/link";
import { Images, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LooksClient } from "@/components/looks/LooksClient";
import { Button } from "@/components/ui/Button";

export default function LooksPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-72 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <Images size={14} aria-hidden="true" />
              Style archive
            </p>
            <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
              Your looks, curated.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Saved outfits, worn combinations, and favorite edits live here so MyFitPick can keep learning what feels right.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Link href="/outfit">
              <Button className="w-full rounded-full">
                <Sparkles size={18} aria-hidden="true" />
                Build a look
              </Button>
            </Link>
            <Link href="/wardrobe/add">
              <Button variant="secondary" className="w-full rounded-full">
                <Plus size={18} aria-hidden="true" />
                Add a piece
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <LooksClient />
    </AppShell>
  );
}
