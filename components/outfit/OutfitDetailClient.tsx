"use client";

import { useCallback, useEffect, useState } from "react";
import { OutfitResult } from "@/components/outfit/OutfitResult";
import {
  OutfitApiErrorState,
  OutfitAuthRequiredState,
  OutfitBackendUnavailableState,
  OutfitGeneratingState,
  OutfitNotFoundState
} from "@/components/outfit/OutfitIntegrationStates";
import { useSession } from "@/hooks/use-session";
import { getOutfit } from "@/lib/api-client";
import type { OutfitRecommendation } from "@/types/outfit";

export function OutfitDetailClient({
  id,
  mockOutfit
}: {
  id: string;
  mockOutfit?: OutfitRecommendation;
}) {
  const session = useSession();

  const [outfit, setOutfit] =
    useState<OutfitRecommendation | null>(
      mockOutfit || null
    );

  const [status, setStatus] = useState<
    "idle" |
    "loading" |
    "ready" |
    "not-found" |
    "unavailable" |
    "error"
  >("idle");

  const [canSwap, setCanSwap] = useState(false);

  async function sendFeedback(
    liked: boolean,
    reason = ""
  ) {
    try {
      await fetch(
        `/api/outfits/${id}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            liked,
            reason
          })
        }
      );

      alert(
        liked
          ? "Thanks! We'll learn from this outfit."
          : "Thanks for the feedback."
      );
    } catch (error) {
      console.error(error);
    }
  }

  const loadOutfit = useCallback(async () => {
    setStatus("loading");

    const result = await getOutfit(id);

    if (result.ok) {
      setOutfit(result.data.outfit);
      setCanSwap(true);
      setStatus("ready");
      return;
    }

    if (mockOutfit) {
      setOutfit(mockOutfit);
      setCanSwap(false);

      setStatus(
        result.error.code === "INTERNAL_ERROR"
          ? "unavailable"
          : "ready"
      );

      return;
    }

    setOutfit(null);
    setCanSwap(false);

    setStatus(
      result.error.code === "NOT_FOUND"
        ? "not-found"
        : result.error.code ===
            "INTERNAL_ERROR"
          ? "unavailable"
          : "error"
    );
  }, [id, mockOutfit]);

  useEffect(() => {
    if (session.status === "authenticated") {
      void loadOutfit();
    }
  }, [loadOutfit, session.status]);

  if (
    session.status === "loading" ||
    status === "loading" ||
    (
      session.status === "authenticated" &&
      status === "idle" &&
      !mockOutfit
    )
  ) {
    return <OutfitGeneratingState />;
  }

  if (session.status === "logged-out") {
    return (
      <>
        <OutfitAuthRequiredState />
        {mockOutfit ? (
          <OutfitResult outfit={mockOutfit} />
        ) : null}
      </>
    );
  }

  if (
    session.status === "backend-unavailable" ||
    status === "unavailable"
  ) {
    return (
      <>
        <OutfitBackendUnavailableState
          onRetry={
            session.status ===
            "backend-unavailable"
              ? session.refresh
              : loadOutfit
          }
        />

        {mockOutfit ? (
          <OutfitResult outfit={mockOutfit} />
        ) : null}
      </>
    );
  }

  if (status === "not-found" || !outfit) {
    return <OutfitNotFoundState />;
  }

  if (status === "error") {
    return (
      <OutfitApiErrorState
        onRetry={loadOutfit}
      />
    );
  }

  return (
    <>
      <OutfitResult
        outfit={outfit}
        canSwap={canSwap}
        onOutfitChange={setOutfit}
      />

      <div className="mt-6 flex gap-4">
        <button
          className="rounded-lg border px-4 py-2"
          onClick={() =>
            sendFeedback(true)
          }
        >
          👍 Love this outfit
        </button>

        <button
          className="rounded-lg border px-4 py-2"
          onClick={() =>
            sendFeedback(
              false,
              "Too formal"
            )
          }
        >
          👎 Not for me
        </button>
      </div>
    </>
  );
}