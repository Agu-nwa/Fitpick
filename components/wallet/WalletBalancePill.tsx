"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import { getWallet } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function WalletBalancePill({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let mounted = true;
    void getWallet().then((result) => {
      if (!mounted) return;
      if (result.ok) setBalance(result.data.wallet.balance);
      else if (result.error.code === "UNAUTHORIZED") setVisible(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/wallet"
      className={cn(
        "focus-ring inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border border-cocoa/20 bg-cocoa/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-cocoa transition hover:border-cocoa/40 hover:bg-cocoa/15",
        compact ? "px-2.5 py-1 text-[10px]" : "",
        className
      )}
      aria-label={`${balance ?? "Loading"} Credits`}
    >
      <WalletCards size={compact ? 13 : 14} aria-hidden="true" />
      <span className="truncate">{balance === null ? "Credits" : `${balance} Credits`}</span>
    </Link>
  );
}
