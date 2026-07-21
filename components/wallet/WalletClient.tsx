"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Gift, Rocket, ShieldCheck, Sparkles, WalletCards, X } from "lucide-react";
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
  type CreditPackSummary,
  type CreditWalletData
} from "@/lib/api-client";

const cryptoComingSoonCopy = "Crypto payments are coming soon.";

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

function PaymentMethodSummary({
  onCryptoClick
}: {
  onCryptoClick: () => void;
}) {
  return (
    <Card className="space-y-3 border-cocoa/20 bg-gradient-to-br from-white via-canvas to-cocoa/5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Payment methods</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-success/25 bg-white/80 p-4 shadow-soft">
          <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-ink">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={17} className="text-success" aria-hidden="true" />
              Card
            </span>
            <Badge tone="success">Available</Badge>
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted">
            Tap any Credit pack to start secure Stripe checkout immediately.
          </span>
        </div>

        <button
          type="button"
          title="Crypto payments will be available soon."
          aria-label="USDT payments coming soon"
          onClick={onCryptoClick}
          className="focus-ring group rounded-2xl border border-cocoa/15 bg-gradient-to-br from-cocoa/10 via-white/75 to-olive/10 p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-cocoa/35"
        >
          <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-ink">
            <span className="inline-flex items-center gap-2">
              <Rocket size={17} className="text-cocoa transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              USDT
            </span>
            <Badge tone="premium">Coming Soon</Badge>
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted">
            Secure crypto payments are on the way. USDT purchases will support TRC20, BEP20, and ERC20.
          </span>
        </button>
      </div>
    </Card>
  );
}

function CryptoComingSoonModal({
  onClose,
  onContinueWithCard,
  cardBusy,
  cardReady
}: {
  onClose: () => void;
  onContinueWithCard: () => void;
  cardBusy: boolean;
  cardReady: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="crypto-coming-soon-title">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-cocoa/20 bg-surface shadow-glow">
        <div className="bg-gradient-to-br from-cocoa/12 via-white to-olive/12 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-cocoa text-canvas shadow-soft">
              <Rocket size={21} aria-hidden="true" />
            </span>
            <button type="button" onClick={onClose} className="focus-ring rounded-full p-2 text-muted hover:bg-white/70 hover:text-ink" aria-label="Close crypto payments coming soon">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <h3 id="crypto-coming-soon-title" className="mt-4 text-2xl font-black tracking-[-0.03em] text-ink">Crypto Payments Coming Soon</h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            We&apos;re completing our secure cryptocurrency payment integration.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Soon you&apos;ll be able to purchase FitPick Credits using USDT.
          </p>
          <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cocoa">Supported networks will include</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['TRC20', 'BEP20', 'ERC20'].map((network) => <Badge key={network} tone="premium">{network}</Badge>)}
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-ink">For now you can securely purchase credits using Stripe.</p>
        </div>
        <div className="grid gap-2 border-t border-line bg-canvas/80 p-4 sm:grid-cols-2">
          <Button type="button" onClick={onContinueWithCard} disabled={!cardReady || cardBusy}>
            <CreditCard size={16} aria-hidden="true" />
            {cardBusy ? "Opening checkout" : "Continue with Card"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

export function WalletClient() {
  const session = useSession();
  const [data, setData] = useState<CreditWalletData | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "unavailable">("loading");
  const [checkoutPackId, setCheckoutPackId] = useState<string>("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);
  const [routeNotice, setRouteNotice] = useState("");

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const provider = (params.get("provider") || "").toLowerCase();
    if (!["crypto", "coinpayments", "usdt"].includes(provider)) return;

    params.delete("provider");
    const nextQuery = params.toString();
    window.history.replaceState(null, "", `/wallet${nextQuery ? `?${nextQuery}` : ""}`);
    setRouteNotice(cryptoComingSoonCopy);
  }, []);

  const stripeConfigured = Boolean(data?.providers?.stripe?.configured);

  const startCardPayment = async (pack: CreditPackSummary) => {
    setCheckoutPackId(pack.id);
    setCheckoutMessage("");
    const result = await startStripeCheckout({ packId: pack.id });
    if (result.ok && result.data.checkout.checkoutUrl) {
      window.location.href = result.data.checkout.checkoutUrl;
      return;
    }

    setCheckoutMessage(result.ok ? "Card checkout is not available right now." : result.error.message);
    setCheckoutPackId("");
    await loadWallet();
  };

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

      <section id="credit-packs" className="scroll-mt-6 space-y-4">
        <SectionHeader title="Top Up Credits" />
        {routeNotice ? (
          <div className="flex items-start gap-3 rounded-2xl border border-cocoa/20 bg-gradient-to-r from-cocoa/10 via-white/70 to-olive/10 p-4 text-sm leading-6 text-ink">
            <Rocket size={17} className="mt-0.5 shrink-0 text-cocoa" aria-hidden="true" />
            <div>
              <p className="font-bold">{routeNotice}</p>
              <p className="text-xs leading-5 text-muted">Secure crypto payments are on the way. Card checkout is available now.</p>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.packs.map((pack) => (
            <Card key={pack.id} className={`space-y-3 ${checkoutPackId === pack.id ? "border-cocoa/40 bg-cocoa/5" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{pack.label}</p>
                {pack.id === "popular" ? <Badge tone="premium">Popular</Badge> : <Badge tone="neutral">{pack.amountLabel}</Badge>}
              </div>
              <p className="text-3xl font-black tracking-[-0.05em] text-ink">{pack.credits}</p>
              <p className="text-xs leading-5 text-muted">{pack.amountLabel} one-time purchase. Purchased Credits do not expire.</p>
              <Button className="w-full" disabled={!stripeConfigured || Boolean(checkoutPackId)} variant={pack.id === "popular" ? "primary" : "secondary"} onClick={() => void startCardPayment(pack)}>
                <CreditCard size={16} aria-hidden="true" />
                {checkoutPackId === pack.id ? "Opening checkout" : "Top Up Credits"}
              </Button>
            </Card>
          ))}
        </div>
        {checkoutMessage ? <p className="rounded-2xl border border-danger/20 bg-danger/5 p-3 text-xs leading-5 text-danger">{checkoutMessage}</p> : null}
        <PaymentMethodSummary onCryptoClick={() => setCryptoModalOpen(true)} />
        {cryptoModalOpen ? (
          <CryptoComingSoonModal
            onClose={() => setCryptoModalOpen(false)}
            onContinueWithCard={() => {
              setCryptoModalOpen(false);
              document.getElementById("credit-packs")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            cardBusy={Boolean(checkoutPackId)}
            cardReady={stripeConfigured}
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
