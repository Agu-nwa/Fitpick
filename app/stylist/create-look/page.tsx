import { StylistChat } from "@/components/stylist/StylistChat";
import { StylistStudioShell } from "@/components/stylist/StylistStudioShell";
import { requireUser } from "@/lib/auth";
import { isObjectId, serializeWardrobeItem } from "@/lib/wardrobe";
import { WardrobeItem } from "@/models/WardrobeItem";
import { redirect } from "next/navigation";

export default async function CreateLookPage({ searchParams }: { searchParams: Promise<{ wardrobeItemId?: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");
  const { wardrobeItemId = "" } = await searchParams;
  const anchoredItem = isObjectId(wardrobeItemId)
    ? await WardrobeItem.findOne({ _id: wardrobeItemId, userId: auth.user._id, archivedAt: null }).lean()
    : null;

  return (
    <StylistStudioShell className="gap-0 lg:px-8 lg:pb-0 lg:pt-0 xl:px-10">
      <StylistChat
        initialFlow="create"
        productMode="create"
        initialWardrobeItem={anchoredItem ? serializeWardrobeItem(anchoredItem) : null}
      />
    </StylistStudioShell>
  );
}
