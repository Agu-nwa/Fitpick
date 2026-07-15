import { ScanFace, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AvatarStudioClient } from "@/components/avatar/AvatarStudioClient";

export default function AvatarPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[-5rem] size-72 rounded-full bg-olive/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
              <ScanFace size={14} aria-hidden="true" />
              Digital fitting studio
            </p>
            <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
              Build the model MyFitPick styles.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Choose your avatar base, add a full-body model image, and improve try-on previews without changing how your wardrobe data is stored.
            </p>
          </div>
          <div className="rounded-full border border-cocoa/25 bg-cocoa/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cocoa">
            <Sparkles size={14} className="mr-2 inline" aria-hidden="true" />
            Try-on ready
          </div>
        </div>
      </header>
      <div className="mt-7">
        <AvatarStudioClient />
      </div>
    </AppShell>
  );
}
