import { Heart } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SavedLooksClient } from "@/components/outfit/SavedLooksClient";

export default function SavedLooksPage() {
  return (
    <AppShell>
      <header className="border-b border-line pb-8 pt-2 sm:pb-10">
        <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa"><Heart size={14} aria-hidden="true" />Saved looks</p>
        <h1 className="font-editorial mt-3 text-5xl font-semibold leading-[0.95] text-ink sm:text-6xl">Looks worth returning to.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">Open a saved outfit, change one piece, or prepare it for Virtual Try-On.</p>
      </header>
      <SavedLooksClient />
    </AppShell>
  );
}
