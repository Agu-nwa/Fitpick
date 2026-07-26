import { Card } from "@/components/ui/Card";
import { RetryButton } from "@/components/integration/RetryButton";
import { safeUserMessage } from "@/lib/user-facing-errors";

export function ApiErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void | Promise<void> }) {
  return (
    <Card className="border-danger/20 bg-danger/5 p-5">
      <p className="font-editorial text-2xl font-semibold leading-none text-ink">{title}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{safeUserMessage(message)}</p>
      {onRetry ? <RetryButton onRetry={onRetry} /> : null}
    </Card>
  );
}
