import type { GarmentMeasurements, WardrobeCategory } from "@/types/wardrobe";
import type { WardrobeImagePurpose } from "@/types/ai-tagging";

export type IntakeGroupId = "clothing" | "shoes" | "bags" | "accessories";

export type MeasurementKey = keyof GarmentMeasurements;

export type LabelPhotoKind =
  | "care_label"
  | "brand_label"
  | "size_tag"
  | "serial_label"
  | "barcode"
  | "price_tag"
  | "hang_tag";

export type IntakePhotoSlot = {
  key: WardrobeImagePurpose;
  label: string;
  helper: string;
  required?: boolean;
};

export type WardrobeIntakeCategory = {
  id: string;
  group: IntakeGroupId;
  title: string;
  backendCategory: WardrobeCategory;
  subcategory: string;
  description: string;
  image: string;
  slots: IntakePhotoSlot[];
  guidance: string[];
  visionFocus: string[];
  allowedMeasurementKeys: MeasurementKey[];
};

export const intakeGroups: Array<{ id: IntakeGroupId; title: string; description: string; image: string }> = [
  {
    id: "clothing",
    title: "Clothing",
    description: "Tops, bottoms, dresses, tailoring, layers, and one-piece outfits.",
    image: "/fashion/editorial-blue-blouse.png"
  },
  {
    id: "shoes",
    title: "Shoes",
    description: "Sneakers, heels, boots, sandals, loafers, and formal shoes.",
    image: "/fashion/product-espresso-boots.png"
  },
  {
    id: "bags",
    title: "Bags",
    description: "Everyday bags, evening bags, travel pieces, wallets, and clutches.",
    image: "/fashion/product-blush-bag.png"
  },
  {
    id: "accessories",
    title: "Accessories",
    description: "Jewelry, watches, belts, scarves, sunglasses, hats, and finishing pieces.",
    image: "/fashion/editorial-teal-studio.png"
  }
];

const clothingSlots: IntakePhotoSlot[] = [
  { key: "front", label: "Front", helper: "Clear full view", required: true },
  { key: "back", label: "Back", helper: "Back or side view" },
  { key: "fabricCloseUp", label: "Fabric", helper: "Texture or pattern" },
  { key: "label", label: "Label", helper: "Size, brand, care, or code" }
];

const shoeSlots: IntakePhotoSlot[] = [
  { key: "front", label: "Main", helper: "Both shoes together", required: true },
  { key: "back", label: "Side", helper: "Profile, sole, or heel" },
  { key: "fabricCloseUp", label: "Material", helper: "Leather, knit, sole, or hardware" },
  { key: "label", label: "Size", helper: "Tongue, insole, or box label" }
];

const bagSlots: IntakePhotoSlot[] = [
  { key: "front", label: "Front", helper: "Full bag view", required: true },
  { key: "back", label: "Interior", helper: "Inside, side, or base" },
  { key: "fabricCloseUp", label: "Details", helper: "Hardware, leather, canvas, or stitching" },
  { key: "label", label: "Stamp", helper: "Logo, code, serial, or tag" }
];

const accessorySlots: IntakePhotoSlot[] = [
  { key: "front", label: "Main", helper: "Full item view", required: true },
  { key: "back", label: "Detail", helper: "Clasp, back, engraving, or underside" },
  { key: "fabricCloseUp", label: "Material", helper: "Texture, hardware, or finish" },
  { key: "label", label: "Marking", helper: "Stamp, serial, hallmark, or tag" }
];

const topMeasurements: MeasurementKey[] = ["chestWidthCm", "shoulderWidthCm", "sleeveLengthCm", "bodyLengthCm"];
const bottomMeasurements: MeasurementKey[] = ["waistCm", "hipsCm", "inseamCm", "outseamCm"];
const dressMeasurements: MeasurementKey[] = ["chestWidthCm", "shoulderWidthCm", "sleeveLengthCm", "bodyLengthCm", "waistCm", "hipsCm"];
const shoeMeasurements: MeasurementKey[] = ["shoeLengthCm", "heelHeightCm"];

export type WardrobeCategoryRule = {
  allowedMeasurementKeys: MeasurementKey[];
  garmentMeasurementKeys: MeasurementKey[];
};

export const wardrobeCategoryRules: Record<WardrobeCategory, WardrobeCategoryRule> = {
  tops: { allowedMeasurementKeys: topMeasurements, garmentMeasurementKeys: topMeasurements },
  bottoms: { allowedMeasurementKeys: bottomMeasurements, garmentMeasurementKeys: bottomMeasurements },
  dresses: { allowedMeasurementKeys: dressMeasurements, garmentMeasurementKeys: dressMeasurements },
  outerwear: { allowedMeasurementKeys: topMeasurements, garmentMeasurementKeys: topMeasurements },
  shoes: { allowedMeasurementKeys: shoeMeasurements, garmentMeasurementKeys: [] },
  bags: { allowedMeasurementKeys: [], garmentMeasurementKeys: [] },
  accessories: { allowedMeasurementKeys: [], garmentMeasurementKeys: [] }
};

function categoryRuleFor(category?: WardrobeCategory | string): WardrobeCategoryRule {
  return wardrobeCategoryRules[String(category || "") as WardrobeCategory] || wardrobeCategoryRules.tops;
}

export const intakeCategories: WardrobeIntakeCategory[] = [
  {
    id: "shirts",
    group: "clothing",
    title: "Shirt",
    backendCategory: "tops",
    subcategory: "Shirt",
    description: "Button-up shirts, dress shirts, casual shirts, and overshirts.",
    image: "/fashion/product-blue-blouse.png",
    slots: clothingSlots,
    guidance: ["Front view", "Back or side view", "Collar, cuff, fabric, or label"],
    visionFocus: ["shirt type", "collar", "sleeve length", "fabric estimate", "layering use"],
    allowedMeasurementKeys: topMeasurements
  },
  {
    id: "t_shirts",
    group: "clothing",
    title: "T-Shirt",
    backendCategory: "tops",
    subcategory: "T-Shirt",
    description: "Crew neck, V-neck, graphic, plain, fitted, and relaxed tees.",
    image: "/fashion/product-blue-blouse.png",
    slots: clothingSlots,
    guidance: ["Front view", "Back view", "Fabric, print, or label"],
    visionFocus: ["tee type", "neckline", "sleeve length", "print or logo", "fabric weight"],
    allowedMeasurementKeys: topMeasurements
  },
  {
    id: "polos",
    group: "clothing",
    title: "Polo",
    backendCategory: "tops",
    subcategory: "Polo",
    description: "Short-sleeve, long-sleeve, knit, performance, and smart polos.",
    image: "/fashion/product-blue-blouse.png",
    slots: clothingSlots,
    guidance: ["Front view", "Back view", "Collar, placket, fabric, or label"],
    visionFocus: ["polo type", "collar", "placket", "fabric texture", "smart casual use"],
    allowedMeasurementKeys: topMeasurements
  },
  {
    id: "jeans",
    group: "clothing",
    title: "Jeans",
    backendCategory: "bottoms",
    subcategory: "Jeans",
    description: "Straight, slim, wide, relaxed, cropped, and denim jeans.",
    image: "/fashion/editorial-male-teal.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Back pockets", "Waist, wash, hem, or label"],
    visionFocus: ["denim wash", "rise", "leg shape", "length", "casual polish"],
    allowedMeasurementKeys: bottomMeasurements
  },
  {
    id: "trousers",
    group: "clothing",
    title: "Trousers",
    backendCategory: "bottoms",
    subcategory: "Trousers",
    description: "Tailored trousers, chinos, dress pants, cargos, and smart separates.",
    image: "/fashion/editorial-male-teal.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Back or side view", "Waist, pleat, fabric, or label"],
    visionFocus: ["rise", "leg shape", "pleat", "fabric weight", "formality"],
    allowedMeasurementKeys: bottomMeasurements
  },
  {
    id: "blazers",
    group: "clothing",
    title: "Blazer",
    backendCategory: "outerwear",
    subcategory: "Blazer",
    description: "Blazers, sport coats, suit jackets, and smart tailoring layers.",
    image: "/fashion/product-male-overshirt.png",
    slots: clothingSlots,
    guidance: ["Full front view", "Back or lining", "Buttons, lapel, fabric, or label"],
    visionFocus: ["lapel", "structure", "closure", "fabric", "formality"],
    allowedMeasurementKeys: topMeasurements
  },
  {
    id: "skirts",
    group: "clothing",
    title: "Skirt",
    backendCategory: "bottoms",
    subcategory: "Skirt",
    description: "Mini, midi, maxi, pleated, pencil, wrap, and A-line skirts.",
    image: "/fashion/editorial-male-teal.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Back or side view", "Waist, hem, fabric, or label"],
    visionFocus: ["skirt shape", "length", "waist", "fabric drape", "occasion"],
    allowedMeasurementKeys: bottomMeasurements
  },
  {
    id: "shorts",
    group: "clothing",
    title: "Shorts",
    backendCategory: "bottoms",
    subcategory: "Shorts",
    description: "Tailored shorts, denim shorts, casual shorts, and active shorts.",
    image: "/fashion/editorial-male-teal.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Back or side view", "Waist, fabric, or label"],
    visionFocus: ["short type", "rise", "length", "fabric", "warm weather use"],
    allowedMeasurementKeys: bottomMeasurements
  },
  {
    id: "tops",
    group: "clothing",
    title: "Tops",
    backendCategory: "tops",
    subcategory: "Tops",
    description: "Shirts, tees, blouses, knitwear, camisoles, and polo shirts.",
    image: "/fashion/product-blue-blouse.png",
    slots: clothingSlots,
    guidance: ["Front view", "Back or side view", "Fabric detail"],
    visionFocus: ["garment type", "collar or neckline", "sleeve length", "fabric estimate", "layering use"],
    allowedMeasurementKeys: topMeasurements
  },
  {
    id: "bottoms",
    group: "clothing",
    title: "Bottoms",
    backendCategory: "bottoms",
    subcategory: "Bottoms",
    description: "Trousers, jeans, skirts, shorts, and tailored separates.",
    image: "/fashion/editorial-male-teal.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Back or side view", "Waist and fabric detail"],
    visionFocus: ["rise", "leg shape", "length", "fabric weight", "occasion suitability"],
    allowedMeasurementKeys: bottomMeasurements
  },
  {
    id: "dresses",
    group: "clothing",
    title: "Dresses",
    backendCategory: "dresses",
    subcategory: "Dresses",
    description: "Dresses, gowns, and one-piece occasion looks.",
    image: "/fashion/editorial-teal-studio.png",
    slots: clothingSlots,
    guidance: ["Full length front", "Back view", "Fabric or embellishment detail"],
    visionFocus: ["silhouette", "length", "neckline", "fabric drape", "formality"],
    allowedMeasurementKeys: dressMeasurements
  },
  {
    id: "outerwear",
    group: "clothing",
    title: "Outerwear",
    backendCategory: "outerwear",
    subcategory: "Outerwear",
    description: "Blazers, coats, jackets, cardigans, and layering pieces.",
    image: "/fashion/product-male-overshirt.png",
    slots: clothingSlots,
    guidance: ["Full front view", "Back or lining", "Hardware, texture, or label"],
    visionFocus: ["layering suitability", "weight", "closure", "weather suitability", "formality"],
    allowedMeasurementKeys: topMeasurements
  },
  {
    id: "suits_sets",
    group: "clothing",
    title: "Suits & Sets",
    backendCategory: "outerwear",
    subcategory: "Suits & Sets",
    description: "Matching tailoring, co-ords, two-piece sets, and formal ensembles.",
    image: "/fashion/editorial-male-teal.png",
    slots: clothingSlots,
    guidance: ["Full set front", "Back view", "Fabric and lining detail"],
    visionFocus: ["set completeness", "tailoring", "formality", "fabric compatibility", "occasion"],
    allowedMeasurementKeys: [...topMeasurements, ...bottomMeasurements]
  },
  {
    id: "jumpsuits",
    group: "clothing",
    title: "Jumpsuits",
    backendCategory: "dresses",
    subcategory: "Jumpsuits",
    description: "One-piece jumpsuits, rompers, boilersuits, and utility suits.",
    image: "/fashion/editorial-teal-studio.png",
    slots: clothingSlots,
    guidance: ["Full length front", "Back view", "Waist and fabric detail"],
    visionFocus: ["silhouette", "leg shape", "waist", "fabric drape", "occasion"],
    allowedMeasurementKeys: [...dressMeasurements, "inseamCm", "outseamCm"]
  },
  {
    id: "activewear",
    group: "clothing",
    title: "Activewear",
    backendCategory: "tops",
    subcategory: "Activewear",
    description: "Gym, training, athleisure, performance layers, and sportswear.",
    image: "/fashion/product-male-overshirt.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Brand or performance label", "Stretch or mesh detail"],
    visionFocus: ["performance use", "stretch", "breathability", "weather", "sport context"],
    allowedMeasurementKeys: [...topMeasurements, ...bottomMeasurements]
  },
  {
    id: "swimwear",
    group: "clothing",
    title: "Swimwear",
    backendCategory: "tops",
    subcategory: "Swimwear",
    description: "Swimsuits, trunks, bikinis, resort pieces, and cover-ups.",
    image: "/fashion/editorial-blue-blouse.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Back view", "Fabric and label detail"],
    visionFocus: ["coverage", "stretch", "quick-dry suitability", "resort styling", "care"],
    allowedMeasurementKeys: dressMeasurements
  },
  {
    id: "sleepwear",
    group: "clothing",
    title: "Sleepwear",
    backendCategory: "tops",
    subcategory: "Sleepwear",
    description: "Pajamas, robes, lounge sets, slips, and at-home pieces.",
    image: "/fashion/editorial-blue-blouse.png",
    slots: clothingSlots,
    guidance: ["Full item view", "Fabric detail", "Care label"],
    visionFocus: ["comfort", "softness", "fabric", "warmth", "care"],
    allowedMeasurementKeys: [...topMeasurements, ...bottomMeasurements]
  },
  {
    id: "traditional_wear",
    group: "clothing",
    title: "Traditional Wear",
    backendCategory: "dresses",
    subcategory: "Traditional Wear",
    description: "Occasion pieces, native wear, ceremonial sets, and special-occasion tailoring.",
    image: "/fashion/editorial-teal-studio.png",
    slots: clothingSlots,
    guidance: ["Full outfit front", "Back or side view", "Fabric, embroidery, or label detail"],
    visionFocus: ["set pieces", "embroidery", "fabric drape", "occasion", "styling context"],
    allowedMeasurementKeys: [...dressMeasurements, ...bottomMeasurements]
  },
  ...[
    ["sneakers", "Sneakers", "Sneakers, trainers, lifestyle and athletic pairs."],
    ["boots", "Boots", "Ankle, Chelsea, combat, dress, and weather boots."],
    ["heels", "Heels", "Pumps, stilettos, block heels, platforms, and dress heels."],
    ["sandals", "Sandals", "Slides, open-toe sandals, dress sandals, and resort footwear."],
    ["loafers", "Loafers", "Penny loafers, driving shoes, mules, and slip-ons."],
    ["formal_shoes", "Formal Shoes", "Oxfords, derbies, monk straps, and dress shoes."],
    ["sports_shoes", "Sports Shoes", "Performance running, training, football, court, and gym shoes."],
    ["flats", "Flats", "Ballet flats, pointed flats, and everyday flat shoes."]
  ].map(([id, title, description]) => ({
    id,
    group: "shoes" as const,
    title,
    backendCategory: "shoes" as const,
    subcategory: title,
    description,
    image: "/fashion/product-espresso-boots.png",
    slots: shoeSlots,
    guidance: ["Top or pair view", "Side profile", "Sole, heel, or insole size"],
    visionFocus: ["shoe type", "material", "toe shape", "heel", "closure", "season", "weather"],
    allowedMeasurementKeys: shoeMeasurements
  })),
  ...[
    ["tote", "Tote", "Structured and soft totes for work, travel, and errands."],
    ["shoulder_bag", "Shoulder", "Shoulder bags, hobos, and everyday carry pieces."],
    ["crossbody", "Crossbody", "Camera bags, saddle bags, mini bags, and hands-free styles."],
    ["backpack", "Backpack", "Fashion, commuter, leather, canvas, and travel backpacks."],
    ["clutch", "Clutch", "Evening bags, minaudieres, pouches, and formal hand-carry bags."],
    ["travel_bag", "Travel", "Duffels, luggage, weekenders, and large travel pieces."],
    ["wallet", "Wallet", "Wallets, cardholders, pouches, and small leather goods."]
  ].map(([id, title, description]) => ({
    id,
    group: "bags" as const,
    title,
    backendCategory: "bags" as const,
    subcategory: title,
    description,
    image: "/fashion/product-blush-bag.png",
    slots: bagSlots,
    guidance: ["Front view", "Side or interior", "Logo, stamp, serial, or hardware"],
    visionFocus: ["bag shape", "material", "hardware", "occasion", "capacity", "brand evidence"],
    allowedMeasurementKeys: []
  })),
  ...[
    ["jewelry", "Jewelry", "Rings, necklaces, bracelets, earrings, and fine jewelry."],
    ["belts", "Belts", "Leather belts, dress belts, woven belts, and statement belts."],
    ["scarves", "Scarves", "Silk, wool, cotton, printed, and cold-weather scarves."],
    ["watches", "Watches", "Dress watches, sport watches, smart watches, and straps."],
    ["sunglasses", "Sunglasses", "Frames, lenses, cases, and eyewear."],
    ["hats", "Hats", "Caps, beanies, fedoras, fascinators, and occasion hats."],
    ["hair_accessories", "Hair Accessories", "Clips, bands, pins, combs, and statement hair pieces."],
    ["gloves", "Gloves", "Leather, knit, dress, and cold-weather gloves."],
    ["ties", "Ties", "Ties, bow ties, pocket squares, and formal neckwear."]
  ].map(([id, title, description]) => ({
    id,
    group: "accessories" as const,
    title,
    backendCategory: "accessories" as const,
    subcategory: title,
    description,
    image: "/fashion/editorial-teal-studio.png",
    slots: accessorySlots,
    guidance: ["Full item view", "Detail view", "Marking, clasp, hallmark, or tag"],
    visionFocus: ["accessory type", "material", "finish", "occasion", "brand evidence", "care"],
    allowedMeasurementKeys: []
  }))
];

export const labelPhotoKinds: Array<{ id: LabelPhotoKind; label: string; helper: string }> = [
  { id: "care_label", label: "Care label", helper: "Washing, drying, ironing, or dry-cleaning symbols." },
  { id: "brand_label", label: "Brand label", helper: "Neck label, logo patch, stamp, or interior brand mark." },
  { id: "size_tag", label: "Size tag", helper: "Size, fit, width, or shoe-size detail." },
  { id: "serial_label", label: "Serial label", helper: "Serial, date code, style code, SKU, or manufacturer text." },
  { id: "barcode", label: "Barcode", helper: "Barcode or QR-style product label." },
  { id: "price_tag", label: "Price tag", helper: "Retail tag or price label when useful for records." },
  { id: "hang_tag", label: "Hang tag", helper: "Brand hang tag, product tag, or care card." }
];

export function findIntakeCategory(categoryId?: string | null) {
  return intakeCategories.find((category) => category.id === categoryId) || null;
}

export function categoryFromBackend(category?: WardrobeCategory | string, subcategory?: string) {
  return (
    intakeCategories.find((item) => item.backendCategory === category && item.subcategory.toLowerCase() === String(subcategory || "").toLowerCase()) ||
    intakeCategories.find((item) => item.backendCategory === category) ||
    null
  );
}

export function measurementKeysForCategory(category?: WardrobeCategory | string, subcategory?: string): MeasurementKey[] {
  const intakeCategory = categoryFromBackend(category, subcategory);
  if (intakeCategory) return intakeCategory.allowedMeasurementKeys;
  return categoryRuleFor(category).allowedMeasurementKeys;
}

export function garmentMeasurementKeysForCategory(category?: WardrobeCategory | string, subcategory?: string): MeasurementKey[] {
  const intakeCategory = categoryFromBackend(category, subcategory);
  if (intakeCategory) return intakeCategory.group === "clothing" ? intakeCategory.allowedMeasurementKeys : [];
  return categoryRuleFor(category).garmentMeasurementKeys;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeGarmentMeasurementsForCategory(
  measurements: unknown,
  category?: WardrobeCategory | string,
  subcategory?: string
) {
  if (!isRecord(measurements)) return {};

  const allowed = new Set(garmentMeasurementKeysForCategory(category, subcategory));
  return Object.fromEntries(
    Object.entries(measurements).filter(
      ([key, value]) => allowed.has(key as MeasurementKey) && value !== "" && value !== null && value !== undefined
    )
  ) as Partial<Record<MeasurementKey, unknown>>;
}

export function cleanGarmentMeasurements(
  measurements: Partial<Record<MeasurementKey, number | null | undefined>> = {},
  category?: WardrobeCategory | string,
  subcategory?: string
) {
  const sanitized = sanitizeGarmentMeasurementsForCategory(measurements, category, subcategory);
  return Object.fromEntries(
    Object.entries(sanitized)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0)
      .map(([key, value]) => [key, Math.round(Number(value) * 10) / 10])
  ) as GarmentMeasurements;
}

export function confidenceLabel(confidence?: number, source?: string) {
  if (source === "user_confirmed") return "User Confirmed";
  if (source === "ocr" && (confidence || 0) >= 0.8) return "Verified";
  return "Estimated";
}
