"use client";

import Link from "next/link";
import { ApiErrorState } from "@/components/integration/ApiErrorState";
import { AuthRequiredState } from "@/components/integration/AuthRequiredState";
import { BackendUnavailableState } from "@/components/integration/BackendUnavailableState";
import { LoadingCard } from "@/components/integration/LoadingCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { emptyStates } from "@/lib/mock-data";

export function WardrobeLoadingState() {
  return <LoadingCard title="Loading wardrobe" />;
}

export function WardrobeEmptyState() {
  return (
    <EmptyState
      title={emptyStates.wardrobe.title}
      body={emptyStates.wardrobe.body}
      cta={emptyStates.wardrobe.cta}
      href="/wardrobe/add"
    />
  );
}

export function WardrobeAuthRequiredState() {
  return <AuthRequiredState />;
}

export function WardrobeBackendUnavailableState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return <BackendUnavailableState onRetry={onRetry} />;
}

export function WardrobeApiErrorState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return (
    <ApiErrorState
      title="Wardrobe unavailable"
      message="MyFitPick could not load wardrobe details right now. You can try again in a moment."
      onRetry={onRetry}
    />
  );
}

export function WardrobeSaveSuccessState({ title, body, href }: { title: string; body: string; href?: string }) {
  return (
    <Card className="border-success/20 bg-success/10 p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{body}</p>
      {href ? (
        <Link href={href}>
          <Button className="mt-4 w-full">View item</Button>
        </Link>
      ) : null}
    </Card>
  );
}
