import type { WardrobeImageAsset } from "@/types/ai-tagging";

export type UploadIntelligence = {
  imageQuality: {
    blurry: boolean | null;
    lowResolution: boolean;
    excessiveCompression: boolean | null;
    poorLighting: boolean | null;
    heavyShadows: boolean | null;
    overexposed: boolean | null;
    underexposed: boolean | null;
    confidence: number;
  };
  garmentVisibility: {
    frontVisible: boolean;
    backVisible: boolean;
    sideOnly: boolean | null;
    cropped: boolean | null;
    folded: boolean | null;
    hiddenAreas: boolean | null;
    confidence: number;
  };
  backgroundQuality: {
    plainBackground: boolean | null;
    clutteredBackground: boolean | null;
    mannequin: boolean | null;
    hanger: boolean | null;
    flatLay: boolean | null;
    worn: boolean | null;
    mirrorSelfie: boolean | null;
    confidence: number;
  };
  cleanliness: {
    wrinkles: boolean | null;
    stains: boolean | null;
    creases: boolean | null;
    reflections: boolean | null;
    obstruction: boolean | null;
    confidence: number;
  };
  multipleGarments: {
    status: "single" | "multiple" | "accessories_mixed" | "unknown";
    confidence: number;
  };
  warnings: string[];
};

function dimensions(asset?: WardrobeImageAsset) {
  const original = asset?.variants?.original;
  const width = Number(original?.width || 0);
  const height = Number(original?.height || 0);
  const bytes = Number(original?.bytes || 0);
  return { width, height, bytes };
}

function collectAssets(images?: {
  front?: WardrobeImageAsset;
  back?: WardrobeImageAsset;
  fabricCloseUp?: WardrobeImageAsset;
  label?: WardrobeImageAsset;
  additional?: WardrobeImageAsset[];
}) {
  return [images?.front, images?.back, images?.fabricCloseUp, images?.label, ...(images?.additional || [])].filter(Boolean) as WardrobeImageAsset[];
}

export function buildImageQualityIntelligence(input: {
  images?: {
    front?: WardrobeImageAsset;
    back?: WardrobeImageAsset;
    fabricCloseUp?: WardrobeImageAsset;
    label?: WardrobeImageAsset;
    additional?: WardrobeImageAsset[];
  };
}): UploadIntelligence {
  const assets = collectAssets(input.images);
  const imageDims = assets.map(dimensions).filter((entry) => entry.width || entry.height || entry.bytes);
  const smallestPixels = imageDims.length
    ? Math.min(...imageDims.map((entry) => (entry.width || 0) * (entry.height || 0)).filter(Boolean))
    : 0;
  const lowestBytesPerMegapixel = imageDims.length
    ? Math.min(...imageDims.map((entry) => {
        const megapixels = ((entry.width || 0) * (entry.height || 0)) / 1_000_000;
        return megapixels > 0 && entry.bytes ? entry.bytes / megapixels : Number.POSITIVE_INFINITY;
      }))
    : Number.POSITIVE_INFINITY;
  const lowResolution = Boolean(smallestPixels && smallestPixels < 800_000);
  const excessiveCompression = Number.isFinite(lowestBytesPerMegapixel)
    ? lowestBytesPerMegapixel < 120_000
    : null;
  const warnings = [
    lowResolution ? "Image resolution may be too low for detailed analysis." : "",
    excessiveCompression ? "Image appears heavily compressed; fine details may be limited." : "",
    !input.images?.front ? "Front view is missing, so styling detail may be limited." : "",
    !input.images?.back ? "Back view is missing, so back details may be limited." : ""
  ].filter(Boolean);

  return {
    imageQuality: {
      blurry: null,
      lowResolution,
      excessiveCompression,
      poorLighting: null,
      heavyShadows: null,
      overexposed: null,
      underexposed: null,
      confidence: imageDims.length ? 0.55 : 0.2
    },
    garmentVisibility: {
      frontVisible: Boolean(input.images?.front),
      backVisible: Boolean(input.images?.back),
      sideOnly: null,
      cropped: null,
      folded: null,
      hiddenAreas: null,
      confidence: input.images?.front || input.images?.back ? 0.62 : 0.25
    },
    backgroundQuality: {
      plainBackground: null,
      clutteredBackground: null,
      mannequin: null,
      hanger: null,
      flatLay: null,
      worn: null,
      mirrorSelfie: null,
      confidence: 0.2
    },
    cleanliness: {
      wrinkles: null,
      stains: null,
      creases: null,
      reflections: null,
      obstruction: null,
      confidence: 0.2
    },
    multipleGarments: {
      status: "unknown",
      confidence: 0.2
    },
    warnings
  };
}

function mergeRecord(base: any, incoming: any) {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return base;
  return { ...base, ...incoming };
}

export function mergeUploadIntelligence(aiValue: unknown, fallback: UploadIntelligence): UploadIntelligence {
  if (!aiValue || typeof aiValue !== "object" || Array.isArray(aiValue)) return fallback;
  const ai = aiValue as any;
  return {
    imageQuality: mergeRecord(fallback.imageQuality, ai.imageQuality),
    garmentVisibility: mergeRecord(fallback.garmentVisibility, ai.garmentVisibility),
    backgroundQuality: mergeRecord(fallback.backgroundQuality, ai.backgroundQuality),
    cleanliness: mergeRecord(fallback.cleanliness, ai.cleanliness),
    multipleGarments: mergeRecord(fallback.multipleGarments, ai.multipleGarments),
    warnings: Array.from(new Set([...(fallback.warnings || []), ...((Array.isArray(ai.warnings) ? ai.warnings : []) as string[])])).slice(0, 12)
  };
}
