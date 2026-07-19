"use client";

import Link from "next/link";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function OutfitGeneratingState() {
  return <LoadingCard title="Choosing clothes" />;
}

export function OutfitBackendUnavailableState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return (
    <BackendUnavailableState onRetry={onRetry} />
  );
}

export function OutfitAuthRequiredState() {
  return <AuthRequiredState />;
}

export function NotEnoughWardrobeItemsState() {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink">Your wardrobe needs a few more pieces.</p>
      <p className="mt-2 text-xs leading-5 text-muted">Add a top, bottom, dress, shoes, or outerwear piece so MyFitPick has enough to work with.</p>
      <Link href="/wardrobe/add">
        <Button className="mt-4 w-full">Add clothes</Button>
      </Link>
    </Card>
  );
}

export function PremiumLimitState() {
  return (
    <Card className="border-cocoa/20 bg-cocoa/10 p-4">
      <p className="text-sm font-semibold text-ink">Credits needed</p>
      <p className="mt-2 text-xs leading-5 text-muted">You&apos;re out of Credits. Purchase more Credits to continue premium actions.</p>
      <Link href="/wallet">
        <Button className="mt-4 w-full">Open wallet</Button>
      </Link>
    </Card>
  );
}

export function OutfitNotFoundState() {
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-ink">Outfit not found</p>
      <p className="mt-2 text-xs leading-5 text-muted">This outfit is not available.</p>
      <Link href="/outfit">
        <Button className="mt-4 w-full">Build an outfit</Button>
      </Link>
    </Card>
  );
}

export function OutfitApiErrorState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return (
    <ApiErrorState
      title="Outfit unavailable"
      message="We could not load outfit ideas right now. Please try again in a moment."
      onRetry={onRetry}
    />
  );
}
