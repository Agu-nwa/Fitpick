import { ApiErrorState } from "@/components/integration/ApiErrorState";

export function BackendUnavailableState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return (
    <ApiErrorState
      title="Backend unavailable"
      message="MyFitPick could not reach the API. Please try again shortly."
      onRetry={onRetry}
    />
  );
}
