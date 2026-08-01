"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Gift, Sparkles, WalletCards } from "lucide-react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useSession } from "@/hooks/use-session";
import { appStorePurchasesAvailable, loadAppStoreProducts, purchaseAppStoreCreditPack, type AppStoreProductSummary } from "@/lib/payments/app-store-client";
import {
  getWallet,
  startStripeCheckout,
  type CreditPackSummary,
  type CreditWalletData
} from "@/lib/api-client";
import { safeUserMessage } from "@/lib/user-facing-errors";

function friendlyFeature(feature: string) {
  if (feature === "credit_purchase") return "Credit purchase";
  if (feature === "credit_purchase_refund") return "Credit refund";
  return feature
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function signedCredits(value: number) {
  const formatted = formatCredits(value);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatCredits(Math.abs(value))}`;
  return "0";
}

function formatCredits(value: number | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function statusTone(status: string): Parameters<typeof Badge>[0]["tone"] {
  if (["credited", "spent"].includes(status)) return "success";
  if (["failed", "expired", "chargeback"].includes(status)) return "danger";
  if (["pending", "review_required", "disputed"].includes(status)) return "warning";
  return "neutral";
}

function PaymentMethodSummary() {
  return (
    <Card className="space-y-3 border-cocoa/20 bg-gradient-to-br from-white via-canvas to-cocoa/5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Payment method</p>
      <div className="rounded-2xl border border-success/25 bg-white/80 p-4 shadow-soft">
        <span className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-ink">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 size={17} className="text-success" aria-hidden="true" />
            Card or digital wallet
          </span>
          <Badge tone="success">Available</Badge>
        </span>
        <span className="mt-2 block text-xs leading-5 text-muted">
          Secure checkout is available now.
        </span>
      </div>
    </Card>
  );
}

export function WalletClient() {
  const session = useSession();
  const [data, setData] = useState<CreditWalletData | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "unavailable">("loading");
  const [checkoutPackId, setCheckoutPackId] = useState<string>("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [nativeProducts, setNativeProducts] = useState<Map<string, AppStoreProductSummary>>(new Map());
  const [nativeMode, setNativeMode] = useState(false);
  const creditPacksRef = useRef<HTMLElement>(null);

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

  const stripeConfigured = Boolean(data?.providers?.stripe?.configured);
  const appStoreConfigured = Boolean(data?.providers?.appStore?.configured);

  useEffect(() => {
    if (!data || !session.user?.id || !appStorePurchasesAvailable()) {
      setNativeMode(false);
      return;
    }

    setNativeMode(true);
    void loadAppStoreProducts(data.packs, session.user.id)
      .then(setNativeProducts)
      .catch(() => setNativeProducts(new Map()));
  }, [data, session.user?.id]);

  const startCardPayment = async (pack: CreditPackSummary) => {
    setCheckoutPackId(pack.id);
    setCheckoutMessage("");
    const result = await startStripeCheckout({ packId: pack.id });
    if (result.ok && result.data.checkout.checkoutUrl) {
      window.location.href = result.data.checkout.checkoutUrl;
      return;
    }

    setCheckoutMessage(result.ok ? "We couldn’t complete the payment. Please try again." : safeUserMessage(result.error, "We couldn’t complete the payment. Please try again."));
    setCheckoutPackId("");
    await loadWallet();
  };

  const startAppStorePayment = async (pack: CreditPackSummary) => {
    if (!session.user?.id) return;
    setCheckoutPackId(pack.id);
    setCheckoutMessage("");
    try {
      await purchaseAppStoreCreditPack({ pack, userId: session.user.id });
      setCheckoutMessage("Purchase complete. Your Credits will appear once the App Store confirmation finishes.");
      await loadWallet();
    } catch {
      setCheckoutMessage("We couldn’t complete the App Store purchase. Please try again.");
    } finally {
      setCheckoutPackId("");
    }
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
              <p className="mt-3 text-6xl font-black leading-none tracking-[-0.08em] text-ink">{formatCredits(data.wallet.balance)}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">20 complimentary Credits added.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Complimentary</p>
              <p className="mt-2 text-xl font-bold text-ink">{formatCredits(data.wallet.complimentaryCreditsRemaining)}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Purchased</p>
              <p className="mt-2 text-xl font-bold text-ink">{formatCredits(data.wallet.purchasedCreditsRemaining)}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Spent</p>
              <p className="mt-2 text-xl font-bold text-ink">{formatCredits(data.wallet.totalCreditsSpent)}</p>
            </div>
            <div className="rounded-2xl border border-line bg-canvas/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Bought</p>
              <p className="mt-2 text-xl font-bold text-ink">{formatCredits(data.wallet.totalCreditsPurchased)}</p>
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
              <Badge tone="premium">{formatCredits(cost.credits)}</Badge>
            </div>
          ))}
        </Card>
      </div>

      <section ref={creditPacksRef} id="credit-packs" className="scroll-mt-6 space-y-4">
        <SectionHeader title="Top Up Credits" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.packs.map((pack) => (
            <Card key={pack.id} className={`space-y-3 ${checkoutPackId === pack.id ? "border-cocoa/40 bg-cocoa/5" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{pack.label}</p>
                {pack.id === "popular" ? <Badge tone="premium">Popular</Badge> : <Badge tone="neutral">{pack.amountLabel}</Badge>}
              </div>
              <p className="text-3xl font-black tracking-[-0.05em] text-ink">{pack.credits}</p>
              <p className="text-xs leading-5 text-muted">
                {nativeMode
                  ? `${nativeProducts.get(pack.appStoreProductId || "")?.priceLabel || pack.amountLabel} App Store purchase. Purchased Credits do not expire.`
                  : `${pack.amountLabel} one-time purchase. Purchased Credits do not expire.`}
              </p>
              <Button
                className="w-full"
                disabled={nativeMode ? (!appStoreConfigured || Boolean(checkoutPackId) || !pack.appStoreProductId) : (!stripeConfigured || Boolean(checkoutPackId))}
                variant={pack.id === "popular" ? "primary" : "secondary"}
                onClick={() => void (nativeMode ? startAppStorePayment(pack) : startCardPayment(pack))}
              >
                <CreditCard size={16} aria-hidden="true" />
                {checkoutPackId === pack.id ? (nativeMode ? "Opening App Store" : "Opening checkout") : "Top Up Credits"}
              </Button>
            </Card>
          ))}
        </div>
        {checkoutMessage ? <p className="rounded-2xl border border-cocoa/20 bg-cocoa/5 p-3 text-xs leading-5 text-ink">{checkoutMessage}</p> : null}
        {nativeMode ? (
          <Card className="border-cocoa/20 bg-gradient-to-br from-white via-canvas to-cocoa/5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cocoa">Payment method</p>
            <p className="mt-2 text-sm font-semibold text-ink">App Store purchase</p>
            <p className="mt-2 text-xs leading-5 text-muted">Credits purchased in the iOS app are processed securely by Apple.</p>
          </Card>
        ) : (
          <PaymentMethodSummary />
        )}
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
        <SectionHeader title="Credit activity" />
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
            <p className="rounded-2xl border border-line bg-canvas/60 p-4 text-sm leading-6 text-muted">Outfit recommendations, weather styling, and closet browsing are free.</p>
          )}
        </Card>
      </section>
    </section>
  );
}
