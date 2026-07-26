"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";

const promises = [
  "Organise your wardrobe",
  "Create complete outfits",
  "Match inspiration with clothes you own",
  "Preview looks before you wear them"
];

export function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function completeWelcome() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_welcome" })
      });

      if (!response.ok) throw new Error("Unable to complete welcome");
      router.push("/onboarding");
      router.refresh();
    } catch {
      setMessage("We could not continue right now. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-canvas px-5 py-[calc(2rem+var(--safe-top))] text-ink">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_12%,rgba(85,124,120,0.14),transparent_30%),radial-gradient(circle_at_80%_24%,rgba(216,185,140,0.18),transparent_28%)]" />
      <section className="w-full max-w-[620px] rounded-[34px] border border-line bg-surface/88 p-6 shadow-card backdrop-blur-xl sm:p-10">
        <BrandLogo size="lg" priority />
        <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.32em] text-cocoa">First fitting</p>
        <h1 className="mt-3 font-editorial text-5xl font-semibold leading-[0.95] tracking-editorial text-ink sm:text-6xl">
          Welcome to MyFitPick
        </h1>
        <p className="mt-4 text-lg leading-7 text-muted">Your AI wardrobe and personal stylist.</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-cocoa">Build your closet once. Style it every day.</p>

        <div className="mt-8 space-y-3" aria-label="What MyFitPick helps you do">
          <p className="text-sm font-semibold text-ink">We&apos;ll help you:</p>
          {promises.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-sm font-medium text-ink">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-olive text-white">
                <Check size={14} aria-hidden="true" />
              </span>
              {item}
            </div>
          ))}
        </div>

        {message ? <p className="mt-5 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p> : null}

        <Button type="button" className="mt-8 h-12 w-full rounded-full" disabled={loading} onClick={() => void completeWelcome()}>
          {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
          Get Started
        </Button>
      </section>
    </main>
  );
}
