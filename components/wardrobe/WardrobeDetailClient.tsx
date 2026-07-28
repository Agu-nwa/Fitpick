"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CTABar } from "@/components/ui/CTABar";
import { Button } from "@/components/ui/Button";
import { ImageFrame } from "@/components/ui/ImageFrame";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  WardrobeApiErrorState,
  WardrobeAuthRequiredState,
  WardrobeBackendUnavailableState,
  WardrobeLoadingState,
  WardrobeSaveSuccessState
} from "@/components/wardrobe/WardrobeIntegrationStates";
import { useSession } from "@/hooks/use-session";
import { archiveWardrobeItem, getWardrobeItem, updateWardrobeItem } from "@/lib/api-client";
import { intakeCategories } from "@/lib/wardrobe/category-intelligence";
import { cn } from "@/lib/utils";
import type { GarmentFit, TaggedSize, WardrobeCategory, WardrobeItem } from "@/types/wardrobe";

const categoryOptions: Array<{ value: WardrobeCategory; label: string }> = [
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
  { value: "dresses", label: "Dresses" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "bags", label: "Bags" },
  { value: "accessories", label: "Accessories" }
];

const sizeOptions: Array<{ value: TaggedSize; label: string }> = [
  { value: "unknown", label: "Not sure" },
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "custom", label: "Custom" }
];

const fitOptions = ["Slim", "Regular", "Relaxed", "Oversized", "Not sure"];
const inputClass = "focus-ring mt-2 min-h-12 w-full rounded-2xl border border-line bg-white/85 px-4 py-3 text-sm font-semibold text-ink outline-none placeholder:text-muted";

function garmentFitFromFit(fit: string): GarmentFit {
  const normalized = fit.trim().toLowerCase();
  if (["slim", "regular", "relaxed", "oversized"].includes(normalized)) return normalized as GarmentFit;
  return "unknown";
}

function itemTitle(item: WardrobeItem) {
  return item.name || [item.color, item.subcategory || item.category].filter(Boolean).join(" ") || "Wardrobe item";
}

function cleanList(values?: string[]) {
  return (values || []).map((value) => value.trim()).filter(Boolean).slice(0, 8);
}

function CoreDetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-canvas/60 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cocoa">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value && value !== "unknown" ? value : "Not sure"}</p>
    </div>
  );
}

function ItemDetails({ item }: { item: WardrobeItem }) {
  const imageTone = item.imageTone || "from-stone-100 to-stone-300";
  const frontUrl = item.images?.front?.url || item.thumbnailUrl || item.imageUrl;
  const backUrl = item.images?.back?.url;
  const insights = [
    item.pattern,
    item.fabric,
    item.recognizedEntity,
    ...cleanList(item.formality),
    ...cleanList(item.occasions),
    ...cleanList(item.weather)
  ].filter((value): value is string => Boolean(value && value !== "unknown"));

  return (
    <>
      <section>
        <SectionHeader title="Item photos" />
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageFrame
            src={frontUrl}
            alt={`${itemTitle(item)} front view`}
            aspect="portrait"
            className={cn("border-line", frontUrl ? "" : imageTone)}
            placeholder="Front view"
          />
          {backUrl ? (
            <ImageFrame src={backUrl} alt={`${itemTitle(item)} back view`} aspect="portrait" className="border-line" placeholder="Back view" />
          ) : null}
        </div>
      </section>

      <section className="mt-7">
        <SectionHeader title={itemTitle(item)} />
        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <CoreDetailRow label="Category" value={item.category} />
            <CoreDetailRow label="Subtype" value={item.subcategory} />
            <CoreDetailRow label="Primary colour" value={item.color} />
            <CoreDetailRow label="Size" value={item.taggedSize} />
            <CoreDetailRow label="Fit" value={item.fit || item.garmentFit} />
          </div>
        </Card>
      </section>

      {insights.length ? (
        <section className="mt-7">
          <SectionHeader title="Stylist insights" />
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(insights)).slice(0, 12).map((insight) => <Chip key={insight}>{insight}</Chip>)}
            </div>
          </Card>
        </section>
      ) : null}
    </>
  );
}

function CoreEditForm({ item, disabled, onSubmit }: { item: WardrobeItem; disabled?: boolean; onSubmit: (values: { category: WardrobeCategory; subcategory: string; color: string; taggedSize: TaggedSize; fit: string }) => void | Promise<void> }) {
  const [category, setCategory] = useState<WardrobeCategory>(item.category);
  const [subcategory, setSubcategory] = useState(item.subcategory || "");
  const [color, setColor] = useState(item.color || "");
  const [taggedSize, setTaggedSize] = useState<TaggedSize>(item.taggedSize || "unknown");
  const [fit, setFit] = useState(item.fit || (item.garmentFit && item.garmentFit !== "unknown" ? item.garmentFit : ""));
  const subtypeOptions = useMemo(() => intakeCategories.filter((option) => option.backendCategory === category), [category]);

  useEffect(() => {
    setCategory(item.category);
    setSubcategory(item.subcategory || "");
    setColor(item.color || "");
    setTaggedSize(item.taggedSize || "unknown");
    setFit(item.fit || (item.garmentFit && item.garmentFit !== "unknown" ? item.garmentFit : ""));
  }, [item]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ category, subcategory: subcategory.trim(), color: color.trim(), taggedSize, fit: fit.trim() });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-cocoa">
          Category
          <select className={inputClass} value={category} onChange={(event) => {
            const nextCategory = event.target.value as WardrobeCategory;
            setCategory(nextCategory);
            setSubcategory(intakeCategories.find((option) => option.backendCategory === nextCategory)?.subcategory || "");
          }} disabled={disabled}>
            {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-cocoa">
          Subtype
          <select className={inputClass} value={subcategory} onChange={(event) => setSubcategory(event.target.value)} disabled={disabled}>
            <option value="">Select subtype</option>
            {subtypeOptions.map((option) => <option key={option.id} value={option.subcategory}>{option.title}</option>)}
          </select>
        </label>
      </div>

      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-cocoa">
        Primary colour
        <input className={inputClass} value={color} onChange={(event) => setColor(event.target.value)} placeholder="Black" required disabled={disabled} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-cocoa">
          Size
          <select className={inputClass} value={taggedSize} onChange={(event) => setTaggedSize(event.target.value as TaggedSize)} disabled={disabled}>
            {sizeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-cocoa">
          Fit
          <select className={inputClass} value={fit} onChange={(event) => setFit(event.target.value)} required disabled={disabled}>
            <option value="">Select fit</option>
            {fitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <Button type="submit" className="w-full rounded-full" disabled={disabled || !category || !color.trim() || !fit.trim()}>
        Save changes
      </Button>
    </form>
  );
}

export function WardrobeDetailClient({ id }: { id: string }) {
  const session = useSession();
  const router = useRouter();
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "not-found" | "unavailable" | "error">("idle");
  const [isEditable, setIsEditable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    setStatus("loading");
    const result = await getWardrobeItem(id);
    if (result.ok) {
      setItem(result.data.item);
      setIsEditable(true);
      setStatus("ready");
      return;
    }

    setItem(null);
    setIsEditable(false);
    setStatus(result.error.code === "NOT_FOUND" ? "not-found" : result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }, [id]);

  useEffect(() => {
    if (session.status === "authenticated") void loadItem();
  }, [loadItem, session.status]);

  async function handleUpdate(values: { category: WardrobeCategory; subcategory: string; color: string; taggedSize: TaggedSize; fit: string }) {
    setIsSaving(true);
    setNotice(null);
    const garmentFit = garmentFitFromFit(values.fit);
    const result = await updateWardrobeItem(id, {
      name: [values.color, values.subcategory || values.category].filter(Boolean).join(" "),
      category: values.category,
      subcategory: values.subcategory,
      color: values.color,
      fit: values.fit,
      taggedSize: values.taggedSize,
      sizeSystem: values.taggedSize === "unknown" ? "unknown" : "international",
      garmentFit,
      fitConfidence: garmentFit === "unknown" ? 0 : 1,
      measurementSource: "user_confirmed"
    });
    setIsSaving(false);

    if (result.ok) {
      setItem(result.data.item);
      setIsEditable(true);
      setNotice("Item details saved.");
      return;
    }

    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }

  async function handleArchive() {
    setIsSaving(true);
    setNotice(null);
    const result = await archiveWardrobeItem(id);
    setIsSaving(false);

    if (result.ok) {
      router.push("/wardrobe");
      return;
    }

    setStatus(result.error.code === "INTERNAL_ERROR" ? "unavailable" : "error");
  }

  if (session.status === "loading" || status === "loading" || (session.status === "authenticated" && status === "idle")) {
    return <WardrobeLoadingState />;
  }

  if (session.status === "logged-out") {
    return <WardrobeAuthRequiredState />;
  }

  if (session.status === "backend-unavailable" || status === "unavailable") {
    return <WardrobeBackendUnavailableState onRetry={session.status === "backend-unavailable" ? session.refresh : loadItem} />;
  }

  if (status === "not-found" || !item) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-ink">Item not found</p>
        <p className="mt-2 text-xs leading-5 text-muted">This wardrobe item is not available.</p>
        <Link href="/wardrobe">
          <Button className="mt-4 w-full">Back to wardrobe</Button>
        </Link>
      </Card>
    );
  }

  if (status === "error") return <WardrobeApiErrorState onRetry={loadItem} />;

  return (
    <>
      {notice ? <WardrobeSaveSuccessState title={notice} body={`${itemTitle(item)} is up to date.`} /> : null}
      <ItemDetails item={item} />

      {isEditable ? <section className="mt-7">
        <SectionHeader title="Edit item" />
        <Card className="p-4">
          <CoreEditForm item={item} disabled={isSaving} onSubmit={handleUpdate} />
        </Card>
      </section> : null}

      {isEditable ? <CTABar className="mt-6 grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={() => void handleArchive()} disabled={isSaving}>Delete item</Button>
        <Link href="/wardrobe/add">
          <Button variant="secondary" className="w-full">Add another</Button>
        </Link>
      </CTABar> : null}
    </>
  );
}
