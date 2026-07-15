import { ApiErrorState } from "@/components/integration/ApiErrorState";

export function BackendUnavailableState({ onRetry }: { onRetry?: () => void | Promise<void> }) {
  return (
    <ApiErrorState
      title="Backend unavailable"
      message="MyFitPick could not reach the API. Mock-data screens can still stay available while integration continues."
      onRetry={onRetry}
    />
  );
}
