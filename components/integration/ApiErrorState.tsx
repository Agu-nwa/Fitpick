import { Card } from "@/components/ui/Card";
import { RetryButton } from "@/components/integration/RetryButton";
import { safeUserMessage } from "@/lib/user-facing-errors";

export function ApiErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void | Promise<void> }) {
  return (
    <Card className="border-danger/20 bg-danger/5 p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{safeUserMessage(message)}</p>
      {onRetry ? <RetryButton onRetry={onRetry} /> : null}
    </Card>
  );
}
