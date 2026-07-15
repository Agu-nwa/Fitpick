import Link from "next/link";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { LookPreviewClient } from "@/components/outfit/LookPreviewClient";

export default async function OutfitPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="relative flex min-h-[100svh] w-full bg-canvas text-ink lg:flex-row">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(166,124,82,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(68,74,58,0.12),transparent_26%)]" />
      <DesktopNav />
      <div className="min-w-0 flex-1 overflow-y-auto pb-[calc(8rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] lg:pb-10 lg:pt-10">
        <div className="mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12 xl:px-16">
          <Link href={`/outfit/${id}`} className="mb-5 inline-flex min-h-11 items-center rounded-2xl px-1 text-sm font-semibold text-cocoa">
            Back to outfit
          </Link>
          <LookPreviewClient outfitId={id} />
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
