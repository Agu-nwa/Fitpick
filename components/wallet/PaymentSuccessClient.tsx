"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPaymentPurchase, getWallet, type CreditPurchaseSummary, type CreditWalletSummary } from "@/lib/api-client";

function statusCopy(status?: string) {
  if (!status) return { title: "Confirming payment", detail: "We are checking the provider confirmation.", tone: "warning" as const, icon: Clock3 };
  if (status === "credited") return { title: "Credits added", detail: "Your MyFitPick Credits are now available.", tone: "success" as const, icon: CheckCircle2 };
  if (status === "paid") return { title: "Payment complete", detail: "The payment is confirmed and Credits are being added.", tone: "success" as const, icon: CheckCircle2 };
  if (status === "pending" || status === "confirming") return { title: "Payment still processing", detail: "This can take longer for delayed methods and blockchain confirmations.", tone: "warning" as const, icon: Loader2 };
  if (status === "failed" || status === "expired" || status === "cancelled" || status === "underpaid") return { title: "Payment not completed", detail: "No Credits were added for this payment.", tone: "danger" as const, icon: XCircle };
  if (status === "review_required" || status === "overpaid" || status === "disputed") return { title: "Review required", detail: "Support needs to review this payment before changing your Credits.", tone: "warning" as const, icon: Clock3 };
  return { title: "Payment status", detail: "Your payment status is being updated.", tone: "neutral" as const, icon: Clock3 };
}

function formatCredits(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

export function PaymentSuccessClient({ purchaseId }: { purchaseId?: string }) {
  const [purchase, setPurchase] = useState<CreditPurchaseSummary | null>(null);
  const [wallet, setWallet] = useState<CreditWalletSummary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!purchaseId) {
      setState("error");
      return;
    }

    let stopped = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      const [purchaseResult, walletResult] = await Promise.all([
        getPaymentPurchase(purchaseId!),
        getWallet()
      ]);

      if (stopped) return;
      if (purchaseResult.ok) {
        setPurchase(purchaseResult.data.purchase);
        setState("ready");
      } else {
        setState("error");
      }
      if (walletResult.ok) setWallet(walletResult.data.wallet);

      const status = purchaseResult.ok ? purchaseResult.data.purchase.status : "";
      if (!["credited", "failed", "expired", "cancelled", "underpaid", "review_required"].includes(status) && attempts < 12) {
        window.setTimeout(poll, 3000);
      }
    }

    void poll();
    return () => {
      stopped = true;
    };
  }, [purchaseId]);

  const copy = statusCopy(purchase?.status);
  const Icon = copy.icon;

  if (state === "error") {
    return (
      <Card className="space-y-4">
        <Badge tone="danger">Payment</Badge>
        <h2 className="text-2xl font-bold text-ink">We could not load this payment.</h2>
        <p className="text-sm leading-6 text-muted">Open your wallet to check your latest Credit balance and purchase history.</p>
        <Link href="/wallet">
          <Button className="w-full">Open wallet</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 border-cocoa/20 bg-gradient-to-br from-surface via-surface to-cocoa/10">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-cocoa/10 p-3 text-cocoa">
          <Icon size={24} className={copy.icon === Loader2 ? "animate-spin" : ""} aria-hidden="true" />
        </span>
        <div>
          <Badge tone={copy.tone}>{purchase?.status ? purchase.status.replace(/_/g, " ") : "checking"}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-ink">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{copy.detail}</p>
        </div>
      </div>

      {purchase ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-canvas/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Pack</p>
            <p className="mt-2 text-sm font-bold text-ink">{purchase.packName}</p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Credits</p>
            <p className="mt-2 text-sm font-bold text-ink">{formatCredits(purchase.credits)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-canvas/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Provider</p>
            <p className="mt-2 text-sm font-bold text-ink">{purchase.provider === "stripe" ? "Card or digital wallet" : "USDT"}</p>
          </div>
        </div>
      ) : null}

      {wallet ? (
        <div className="flex items-center justify-between rounded-2xl border border-line bg-canvas/70 p-4">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
            <WalletCards size={16} className="text-cocoa" aria-hidden="true" />
            Current Credits
          </span>
          <span className="text-2xl font-black text-ink">{formatCredits(wallet.balance)}</span>
        </div>
      ) : null}

      <Link href="/wallet">
        <Button className="w-full">Back to wallet</Button>
      </Link>
    </Card>
  );
}
