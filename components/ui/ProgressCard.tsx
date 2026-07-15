import { Card } from "./Card";

export function ProgressCard({ title, body, progress }: { title: string; body: string; progress: number }) {
  return (
    <Card className="overflow-hidden border-olive/20 bg-gradient-to-br from-surface via-surface to-olive/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-editorial text-3xl font-semibold leading-none text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted">{body}</p>
        </div>
        <span className="text-3xl font-black tracking-tight text-cocoa">{progress}%</span>
      </div>
      <div className="mt-5 h-2 rounded-full bg-line">
        <div className="h-2 rounded-full bg-cocoa shadow-glow transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
    </Card>
  );
}
