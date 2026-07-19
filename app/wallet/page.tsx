import { WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { WalletClient } from "@/components/wallet/WalletClient";

export default function WalletPage() {
  return (
    <AppShell>
      <header className="relative overflow-hidden rounded-xl4 border border-line bg-surface/80 p-5 shadow-card sm:p-8">
        <div className="absolute right-[-5rem] top-[-6rem] size-60 rounded-full bg-cocoa/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cocoa">
            <WalletCards size={14} aria-hidden="true" />
            Credits
          </p>
          <h1 className="font-editorial text-balance text-4xl font-semibold leading-[0.98] tracking-editorial text-ink sm:text-5xl lg:text-6xl">
            Your MyFitPick wallet.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Use MyFitPick for free. Spend Credits only when premium chat, previews, or virtual try-on succeed.
          </p>
        </div>
      </header>
      <div className="mt-7">
        <WalletClient />
      </div>
    </AppShell>
  );
}
