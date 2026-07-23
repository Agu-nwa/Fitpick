import Link from "next/link";
import { ArrowUpRight, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { CreditWalletSummary } from "@/lib/api-client";

function formatCredits(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

export function WalletSummaryCard({ wallet }: { wallet: CreditWalletSummary | null }) {
  return (
    <Card className="border-cocoa/20 bg-cocoa/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cocoa">
            <WalletCards size={14} aria-hidden="true" />
            Credits
          </p>
          <p className="mt-2 text-4xl font-black tracking-[-0.05em] text-ink">{formatCredits(wallet?.balance)}</p>
          <p className="mt-1 text-sm leading-6 text-muted">Credits power premium chat, previews, and try-on. Basic outfit recommendations stay free.</p>
        </div>
        <Badge tone="premium">Wallet</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="rounded-2xl border border-line bg-surface/70 p-3">
          <p className="font-semibold text-ink">Spent</p>
          <p className="mt-1">{formatCredits(wallet?.totalCreditsSpent)} Credits</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface/70 p-3">
          <p className="font-semibold text-ink">Complimentary left</p>
          <p className="mt-1">{formatCredits(wallet?.complimentaryCreditsRemaining)} Credits</p>
        </div>
      </div>
      <Link href="/wallet" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cocoa">
        Open wallet
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </Card>
  );
}
