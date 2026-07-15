"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getBillingProviders, getPlusStatus, startCheckout, type BillingProvidersData, type PlusStatusData } from "@/lib/api-client";
import { plusFeatures } from "@/lib/mock-data";
import { useSession } from "@/hooks/use-session";

export function PlusStatusCard({ status }: { status?: PlusStatusData | null }) {
  return (
    <Card className="bg-ink text-canvas">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-canvas/60">{status?.plan === "plus" ? "Plus active" : "Free plan"}</p>
      <h2 className="mt-3 font-editorial text-4xl font-semibold leading-none tracking-editorial">More ways to get dressed.</h2>
      <p className="mt-3 text-sm leading-6 text-canvas/75">
        {status ? `${status.remainingDailyPicks} free outfit pick${status.remainingDailyPicks === 1 ? "" : "s"} remaining today.` : "Get more outfit picks, planning tools, and saved-look space."}
      </p>
    </Card>
  );
}

export function PlusStatusClient({ showBenefits = true }: { showBenefits?: boolean }) {
  const session = useSession();
  const [status, setStatus] = useState<PlusStatusData | null>(null);
  const [providers, setProviders] = useState<BillingProvidersData["providers"] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unavailable" | "checkout">("idle");
  const [message, setMessage] = useState("");

  const loadStatus = useCallback(async () => {
    setState("loading");
    const [result, providersResult] = await Promise.all([getPlusStatus(), getBillingProviders()]);
    if (result.ok) {
      setStatus(result.data);
      setProviders(result.data.availableProviders || (providersResult.ok ? providersResult.data.providers : null));
      setState("idle");
      return;
    }
    setState(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "idle");
  }, []);

  useEffect(() => {
    if (session.status === "authenticated") void loadStatus();
  }, [loadStatus, session.status]);

  async function handleCheckout(provider: "stripe" | "paystack", currency: "USD" | "NGN") {
    const result = await startCheckout({ plan: "plus_monthly", provider, currency });
    if (result.ok) {
      setMessage(result.data.checkout.message || "Checkout is ready as a placeholder.");
      setState("checkout");
      const redirectUrl = result.data.checkout.checkoutUrl || result.data.checkout.authorizationUrl;
      if (result.data.checkout.ready && redirectUrl) window.location.assign(redirectUrl);
      return;
    }
    setMessage("We could not start checkout right now.");
  }

  if (session.status === "loading" || state === "loading") return <LoadingCard title="Loading Plus status" />;
  if (session.status === "logged-out") return <AuthRequiredState />;
  if (session.status === "backend-unavailable" || state === "unavailable") return <BackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadStatus} />;

  return (
    <>
      <PlusStatusCard status={status} />
      <Card className="mt-4 space-y-3 p-4">
        <p className="text-sm font-semibold text-ink">Choose how to upgrade.</p>
        <Button className="w-full" onClick={() => void handleCheckout("paystack", "NGN")}>Pay in Naira with Paystack</Button>
        <p className="text-xs text-muted">{providers?.paystack?.configured ? "Paystack is ready." : "This payment option is not configured yet."}</p>
        <Button variant="secondary" className="w-full" onClick={() => void handleCheckout("stripe", "USD")}>Pay internationally with Stripe</Button>
        <p className="text-xs text-muted">{providers?.stripe?.configured ? "Stripe is ready." : "This payment option is not configured yet."}</p>
      </Card>
      {message ? <Card className="mt-4 p-4"><p className="text-sm font-semibold text-ink">{message}</p></Card> : null}
      {showBenefits ? (
        <div className="mt-7 space-y-3">
          {plusFeatures.map((feature) => (
            <Card key={feature.id} className="p-4">
              <h3 className="text-sm font-semibold text-ink">{feature.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{feature.description}</p>
            </Card>
          ))}
        </div>
      ) : null}
    </>
  );
}
