import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function UploadCard() {
  return (
    <Card className="border-dashed text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cocoa/10 text-2xl text-cocoa" aria-hidden>▧</div>
      <h2 className="text-lg font-semibold text-ink">Add clothes</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Upload photos or take new ones. One item per photo works best.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button>Take photo</Button>
        <Button variant="secondary">Upload</Button>
      </div>
    </Card>
  );
}
