import { getOpenAIClient } from "@/lib/ai/openai";
import { getAiModel } from "@/lib/ai/models/registry";
import type { TryOnVisualRole } from "@/lib/tryon/provider-capabilities";

export type TryOnIntegrityItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  role: TryOnVisualRole;
  referenceImageUrl: string;
};

export type TryOnIntegrityResult = {
  valid: boolean;
  missingItemIds: string[];
  mismatchedItemIds: string[];
  checkedItemIds: string[];
  unavailable: boolean;
  safeReason: string;
};

function usableImageUrl(value: string) {
  if (/^https:\/\//i.test(value) || /^data:image\//i.test(value)) return value;
  if (/^[A-Za-z0-9+/]+=*$/i.test(value.slice(0, 80))) return `data:image/png;base64,${value}`;
  return "";
}

function emptyResult(items: TryOnIntegrityItem[], safeReason: string): TryOnIntegrityResult {
  return {
    valid: false,
    missingItemIds: items.map((item) => item.id),
    mismatchedItemIds: [],
    checkedItemIds: [],
    unavailable: true,
    safeReason
  };
}

export async function validateTryOnVisualIntegrity(input: {
  previewImageUrl: string;
  items: TryOnIntegrityItem[];
}): Promise<TryOnIntegrityResult> {
  const previewImageUrl = usableImageUrl(input.previewImageUrl);
  const items = input.items.filter((item) => item.id && usableImageUrl(item.referenceImageUrl));
  if (!previewImageUrl || items.length !== input.items.length || !items.length) {
    return emptyResult(input.items, "integrity_input_unavailable");
  }

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" } }
  > = [{
    type: "text",
    text: [
      "Audit a virtual try-on image against its selected closet-item references.",
      "The first image is the final try-on preview. Each following image is one selected item in the exact order listed below.",
      "For every item, decide whether the final preview visibly preserves the same garment/accessory type, dominant color, and defining structure.",
      "A provider attempt is irrelevant: judge only what is visibly present in the final preview.",
      "For bottoms, shorts do not match trousers; a skirt does not match trousers; and the leg shape must remain broadly consistent.",
      "For outerwear, it must be visibly worn, not merely implied. For footwear, at least one matching shoe must be visible.",
      "For bags and accessories, mark present only if visibly carried or worn. Do not infer hidden items.",
      "Return JSON only: {\"items\":[{\"id\":string,\"present\":boolean,\"matches\":boolean,\"confidence\":number}],\"valid\":boolean}.",
      `Selected items: ${items.map((item, index) => `${index + 1}. id=${item.id}; name=${item.name}; category=${item.category}; color=${item.color}; role=${item.role}`).join(" | ")}`
    ].join("\n")
  }, {
    type: "image_url",
    image_url: { url: previewImageUrl, detail: "high" }
  }];

  for (const item of items) {
    content.push({
      type: "image_url",
      image_url: { url: usableImageUrl(item.referenceImageUrl), detail: "low" }
    });
  }

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: getAiModel("wardrobeVision"),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content }]
    }, { timeout: 45_000 });
    const raw = JSON.parse(response.choices[0]?.message?.content || "{}");
    const returnedItems = Array.isArray(raw.items) ? raw.items : [];
    const byId = new Map(returnedItems.map((item: any) => [String(item?.id || ""), item]));
    const missingItemIds: string[] = [];
    const mismatchedItemIds: string[] = [];
    const checkedItemIds: string[] = [];
    for (const item of items) {
      const assessment: any = byId.get(item.id);
      if (!assessment || typeof assessment.present !== "boolean" || typeof assessment.matches !== "boolean") {
        missingItemIds.push(item.id);
        continue;
      }
      checkedItemIds.push(item.id);
      if (!assessment.present) missingItemIds.push(item.id);
      else if (!assessment.matches) mismatchedItemIds.push(item.id);
    }
    return {
      valid: missingItemIds.length === 0 && mismatchedItemIds.length === 0 && checkedItemIds.length === items.length,
      missingItemIds,
      mismatchedItemIds,
      checkedItemIds,
      unavailable: false,
      safeReason: missingItemIds.length || mismatchedItemIds.length ? "visual_integrity_failed" : ""
    };
  } catch {
    return emptyResult(items, "visual_integrity_provider_unavailable");
  }
}
