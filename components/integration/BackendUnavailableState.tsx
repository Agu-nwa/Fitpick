import { ApiErrorState } from "@/components/integration/ApiErrorState";

export function BackendUnavailableState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return (
    <ApiErrorState
      title="Service unavailable"
      message="MyFitPick could not finish loading right now. Please try again shortly."
      onRetry={onRetry}
    />
  );
}
