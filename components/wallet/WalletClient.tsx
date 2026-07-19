"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDollarSign, Clock3, CreditCard, Gift, Sparkles, WalletCards } from "lucide-react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import {
  getWallet,
  startStripeCheckout,
  startUsdtCheckout,
  type CreditPackSummary,
  type CreditWalletData
} from "@/lib/api-client";

function friendlyFeature(feature: string) {
  if (feature === "credit_purchase") return "Credit purchase";
  if (feature === "credit_purchase_refund") return "Credit refund";
  return feature
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function signedCredits(value: number) {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return "0";
}

function statusTone(status: string): Parameters<typeof Badge>[0]["tone"] {
  if (["credited", "spent"].includes(status)) return "success";
  if (["failed", "expired", "underpaid", "chargeback"].includes(status)) return "danger";
  if (["pending", "confirming", "review_required", "disputed"].includes(status)) return "warning";
  return "neutral";
}

function PaymentMethodPanel({
  pack,
  data,
  onClose,
  onReload
}: {
  pack: CreditPackSummary;
  data: CreditWalletData;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  const [network, setNetwork] = useState(data.usdtNetworks.find((item) => item.availability === "available")?.id || "");
  const [busy, setBusy] = useState<"stripe" | "coinpayments" | null>(null);
  const [message, setMessage] = useState("");

  const stripeConfigured = Boolean(data.providers?.stripe?.configured);
  const coinpaymentsConfigured = Boolean(data.providers?.coinpayments?.configured);
  const availableNetworks = data.usdtNetworks.filter((item) => item.availability === "available");

  const startCardPayment = async () => {
    setBusy("stripe");
    setMessage("");
    const result = await startStripeCheckout({ packId: pack.id });
    if (result.ok && result.data.checkout.checkoutUrl) {
      window.location.href = result.data.checkout.checkoutUrl;
      return;
    }
    setMessage(result.ok ? "Card checkout is not available right now." : result.error.message);
    setBusy(null);
    await onReload();
  };

  const startUsdtPayment = async () => {
    if (!network) {
      setMessage("Choose a USDT network first.");
      return;
    }
    setBusy("coinpayments");
    setMessage("");
    const result = await startUsdtCheckout({ packId: pack.id, network });
    if (result.ok && result.data.checkout.checkoutUrl) {
      window.location.href = result.data.checkout.checkoutUrl;
      return;
    }
    setMessage(result.ok ? "USDT checkout is not available right now." : result.error.message);
    setBusy(null);
    await onReload();
  };

  return (
    <Card className="space-y-4 border-cocoa/30 bg-cocoa/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Choose how to pay</p>
          <h3 className="mt-2 text-xl font-bold text-ink">{pack.label} Credits</h3>
          <p className="mt-1 text-sm text-muted">{pack.credits} Credits for {pack.amountLabel}</p>
        </div>
        <button type="button" onClick={onClose} className="focus-ring rounded-full px-3 py-2 text-xs font-bold text-muted hover:bg-canvas">
          Close
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          disabled={!stripeConfigured || busy !== null}
          onClick={startCardPayment}
          className="focus-ring rounded-2xl border border-line bg-canvas p-4 text-left shadow-soft transition hover:border-cocoa/40 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-ink">
            <CreditCard size={17} className="text-cocoa" aria-hidden="true" />
            Card or digital wallet
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted">
            Pay securely with card, Apple Pay, Google Pay, Link, or another available method when eligible.
          </span>
          <span className="mt-3 inline-flex text-xs font-bold text-cocoa">{busy === "stripe" ? "Opening checkout" : "Continue"}</span>
        </button>

        <div className="rounded-2xl border border-line bg-canvas p-4 shadow-soft">
          <span className="flex items-center gap-2 text-sm font-bold text-ink">
            <CircleDollarSign size={17} className="text-cocoa" aria-hidden="true" />
            USDT
          </span>
          <p className="mt-2 text-xs leading-5 text-muted">Pay using USDT on a supported blockchain network.</p>
          <label className="mt-3 block text-[11px] font-bold uppercase tracking-[0.16em] text-muted" htmlFor="wallet-usdt-network">
            Network
          </label>
          <select
            id="wallet-usdt-network"
            value={network}
            onChange={(event) => setNetwork(event.target.value)}
            disabled={!availableNetworks.length || busy !== null}
            className="mt-2 w-full rounded-2xl border border-line bg-surface px-3 py-3 text-sm font-semibold text-ink outline-none focus:border-cocoa"
          >
            {availableNetworks.length ? null : <option value="">No networks configured</option>}
            {availableNetworks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName} · {item.network}{item.estimatedFee ? ` · ${item.estimatedFee}` : ""}
              </option>
            ))}
          </select>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            disabled={!coinpaymentsConfigured || !network || busy !== null}
            onClick={startUsdtPayment}
          >
            {busy === "coinpayments" ? "Opening checkout" : "Continue with USDT"}
          </Button>
        </div>
      </div>

      {message ? <p className="rounded-2xl border border-danger/20 bg-danger/5 p-3 text-xs leading-5 text-danger">{message}</p> : null}
    </Card>
  );
}

export function WalletClient() {
  const session = useSession();
  const [data, setData] = useState<CreditWalletData | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "unavailable">("loading");
  const [selectedPackId, setSelectedPackId] = useState<string>("");

  const loadWallet = useCallback(async () => {
    setState("loading");
    const result = await getWallet();
    if (result.ok) {
      setData(result.data);
      setState("idle");
    } else {
      setState("unavailable");
    }
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadWallet();
    if (session.status === "logged-out") setState("idle");
  }, [loadWallet, session.status]);

  const selectedPack = useMemo(
    () => data?.packs.find((pack) => pack.id === selectedPackId) || null,
    [data?.packs, selectedPackId]
  );

  if (session.status === "loading" || state === "loading") return <LoadingCard title="Loading wallet" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (state === "unavailable" || !data) return <BackendUnavailableState onRetry={loadWallet} />;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
        <Card className="border-cocoa/20 bg-gradient-to-br from-surface via-surface to-cocoa/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cocoa">
                <WalletCards size={14} aria-hidden="true" />
                Credits
              </p>
              <p className="mt-3 text-6xl font-black leading-none tracking-[-0.08em] text-ink">{data.wallet.balance}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Your first 20 Credits are complimentary. Credits are spent only after premium actions succeed.</p>
            </div>
            <Badge tone="premium">Credit wallet active</Badge>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Complimentary</p>
              <p className="mt-2 text-xl font-bold text-ink">{data.wallet.complimentaryCreditsRemaining}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Purchased</p>
              <p className="mt-2 text-xl font-bold text-ink">{data.wallet.purchasedCreditsRemaining}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Spent</p>
              <p className="mt-2 text-xl font-bold text-ink">{data.wallet.totalCreditsSpent}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Bought</p>
              <p className="mt-2 text-xl font-bold text-ink">{data.wallet.totalCreditsPurchased}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles size={16} className="text-cocoa" aria-hidden="true" />
            Credit costs
          </p>
          {data.costs.map((cost) => (
            <div key={cost.feature} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-canvas/60 p-3">
              <span>
                <span className="block text-sm font-semibold text-ink">{cost.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{cost.description}</span>
              </span>
              <Badge tone="premium">{cost.credits}</Badge>
            </div>
          ))}
        </Card>
      </div>

      <section className="space-y-4">
        <SectionHeader title="Top Up Credits" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.packs.map((pack) => (
            <Card key={pack.id} className={`space-y-3 ${selectedPackId === pack.id ? "border-cocoa/40 bg-cocoa/5" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{pack.label}</p>
                {pack.id === "popular" ? <Badge tone="premium">Popular</Badge> : <Badge tone="neutral">{pack.amountLabel}</Badge>}
              </div>
              <p className="text-3xl font-black tracking-[-0.05em] text-ink">{pack.credits}</p>
              <p className="text-xs leading-5 text-muted">{pack.amountLabel} one-time purchase. Purchased Credits do not expire.</p>
              <Button className="w-full" variant={selectedPackId === pack.id ? "primary" : "secondary"} onClick={() => setSelectedPackId(pack.id)}>
                Top Up Credits
              </Button>
            </Card>
          ))}
        </div>
        {selectedPack ? (
          <PaymentMethodPanel
            pack={selectedPack}
            data={data}
            onClose={() => setSelectedPackId("")}
            onReload={loadWallet}
          />
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <Gift size={16} className="text-cocoa" aria-hidden="true" />
            Always free
          </p>
          <div className="flex flex-wrap gap-2">
            {data.freeFeatures.map((feature) => <Badge key={feature} tone="neutral">{feature}</Badge>)}
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <CheckCircle2 size={16} className="text-cocoa" aria-hidden="true" />
            Purchase history
          </p>
          {data.purchases.length ? (
            <div className="space-y-2">
              {data.purchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/60 p-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{purchase.packName} · {purchase.credits} Credits</span>
                    <span className="mt-1 block text-xs text-muted">{purchase.createdAt ? new Date(purchase.createdAt).toLocaleString() : "Pending"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone={statusTone(purchase.status)}>{purchase.status.replace(/_/g, " ")}</Badge>
                    <span className="text-sm font-bold text-ink">{purchase.amountLabel}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-line bg-canvas/60 p-4 text-sm leading-6 text-muted">No purchases yet.</p>
          )}
        </Card>
      </section>

      <section>
        <SectionHeader title="Credit ledger" />
        <Card className="space-y-3">
          {data.transactions.length ? (
            <div className="space-y-2">
              {data.transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/60 p-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{friendlyFeature(transaction.feature)}</span>
                    <span className="mt-1 block text-xs text-muted">{transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : "Pending"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={statusTone(transaction.status)}>{transaction.status}</Badge>
                    <span className="text-sm font-bold text-ink">{signedCredits(transaction.credits)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-line bg-canvas/60 p-4 text-sm leading-6 text-muted">No Credit usage yet. Your free wardrobe recommendations do not spend Credits.</p>
          )}
        </Card>
      </section>
    </section>
  );
}
