import { Card } from "./Card";

export function ProgressCard({ title, body, progress }: { title: string; body: string; progress: number }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted">{body}</p>
        </div>
        <span className="text-sm font-semibold text-cocoa">{progress}%</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-line">
        <div className="h-2 rounded-full bg-cocoa" style={{ width: `${progress}%` }} />
      </div>
    </Card>
  );
}
