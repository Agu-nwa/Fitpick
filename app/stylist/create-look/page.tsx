import Link from "next/link";
import { ArrowLeft, WandSparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StylistChat } from "@/components/stylist/StylistChat";

export default function CreateLookPage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/stylist" className="focus-ring mb-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface/80 px-4 text-xs font-bold uppercase tracking-[0.14em] text-muted transition hover:text-ink">
            <ArrowLeft size={15} aria-hidden="true" />
            Stylist
          </Link>
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-cocoa">
            <WandSparkles size={14} aria-hidden="true" />
            Create a Look
          </p>
          <h1 className="font-editorial text-4xl font-semibold leading-none text-ink sm:text-5xl">Create a Look</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            A dedicated styling session built from your saved closet.
          </p>
        </div>
        <p className="rounded-full border border-line bg-surface/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted">
          Editor&apos;s pick
        </p>
      </header>
      <StylistChat initialFlow="create" productMode="create" />
    </AppShell>
  );
}
