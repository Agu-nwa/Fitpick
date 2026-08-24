import { Images } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TryOnHistoryClient } from "@/components/outfit/TryOnHistoryClient";

export default function TryOnHistoryPage() {
  return (
    <AppShell>
      <header className="border-b border-line pb-6 pt-2 sm:pb-8">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa"><Images size={14} aria-hidden="true" />Looks</p>
        <h1 className="font-editorial mt-3 text-4xl font-semibold leading-none tracking-editorial text-ink sm:text-5xl">Your Try-On History.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">Your generated Virtual Try-On previews, organised by week and newest first.</p>
      </header>
      <TryOnHistoryClient />
    </AppShell>
  );
}
