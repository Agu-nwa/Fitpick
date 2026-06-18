"use client";

import { Button } from "@/components/ui/Button";

export function RetryButton({ onRetry, label = "Retry" }: { onRetry: () => void | Promise<void>; label?: string }) {
  return (
    <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => void onRetry()}>
      {label}
    </Button>
  );
}
