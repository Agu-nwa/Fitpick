import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TaxonomyReviewQueue } from "@/components/wardrobe/TaxonomyReviewQueue";
import { requireUser } from "@/lib/auth";
import { serializeWardrobeItem } from "@/lib/wardrobe";
import { sortTaxonomyReviewQueue } from "@/lib/wardrobe/taxonomy-review-queue";
import { WardrobeItem } from "@/models/WardrobeItem";
import type { WardrobeItem as WardrobeItemType } from "@/types/wardrobe";
export const dynamic = "force-dynamic";
export default async function WardrobeReviewPage() { const auth = await requireUser(); if (!auth.ok) redirect("/login"); const records = await WardrobeItem.find({ userId: auth.user._id, archivedAt: { $exists: false } }).sort({ updatedAt: -1, _id: 1 }).lean(); const items = sortTaxonomyReviewQueue(records).map(serializeWardrobeItem) as WardrobeItemType[]; return <AppShell><header className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cocoa">Closet review</p><h1 className="mt-2 font-editorial text-4xl font-semibold text-ink sm:text-5xl">Help us understand your pieces.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Confirm the item types that matter most for shoes, sets, bags and finishing accessories.</p></header><TaxonomyReviewQueue initialItems={items} /></AppShell>; }
