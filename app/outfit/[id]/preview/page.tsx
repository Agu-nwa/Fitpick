import Link from "next/link";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DesktopNav } from "@/components/navigation/DesktopNav";
import { LookPreviewClient } from "@/components/outfit/LookPreviewClient";

export default async function OutfitPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-[100svh] w-full bg-canvas text-ink shadow-soft sm:max-w-[640px] md:my-6 md:min-h-[880px] md:overflow-hidden md:rounded-[2.25rem] md:border md:border-line lg:max-w-[1180px] lg:flex-row xl:max-w-[1320px]">
      <DesktopNav />
      <div className="min-w-0 flex-1 overflow-y-auto pb-[calc(8rem+var(--safe-bottom))] pt-[calc(1.5rem+var(--safe-top))] lg:pb-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
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
