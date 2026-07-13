import Link from "next/link";
import { BottomNav } from "@/components/navigation/BottomNav";
import { LookPreviewClient } from "@/components/outfit/LookPreviewClient";

export default async function OutfitPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="min-h-[100svh] bg-canvas pb-[calc(8rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] text-ink">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link href={`/outfit/${id}`} className="mb-5 inline-flex min-h-11 items-center rounded-2xl px-1 text-sm font-semibold text-cocoa">
          Back to outfit
        </Link>
        <LookPreviewClient outfitId={id} />
      </div>
      <BottomNav />
    </main>
  );
}
