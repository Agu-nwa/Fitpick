import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getWardrobeBackgroundRemovalState, getWardrobeDisplayImage, getWardrobeOriginalImage } from "@/lib/wardrobe";

const original = "https://cdn.example.com/original.webp";
const cutout = "https://cdn.example.com/cutout.webp";
const legacy = { imageUrl: original };
assert.equal(getWardrobeDisplayImage(legacy), original, "Legacy items must retain their image fallback.");
assert.equal(getWardrobeOriginalImage(legacy), original, "Legacy imageUrl must remain a valid original source.");

const completed = {
  imageUrl: original,
  thumbnailUrl: original,
  images: { front: {
    url: original,
    backgroundRemovalStatus: "completed",
    variants: {
      original: { url: original, status: "ready" },
      cutout: { url: cutout, status: "ready" }
    }
  } }
};
assert.equal(getWardrobeDisplayImage(completed), cutout, "Completed cutout must override stale legacy and thumbnail URLs.");
assert.equal(getWardrobeOriginalImage(completed), original, "Selecting a cutout must never overwrite the original source.");
assert.equal(getWardrobeBackgroundRemovalState(completed).status, "completed");

const falseCompletion = { images: { front: { backgroundRemovalStatus: "completed", variants: { original: { url: original, status: "ready" } } } } };
assert.equal(getWardrobeBackgroundRemovalState(falseCompletion).status, "failed", "Completed status without a processed URL must fail closed.");

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const retryRoute = source("app/api/wardrobe/[id]/background-removal/route.ts");
assert.match(retryRoute, /backgroundRemovalStatus": \{ \$ne: "processing" \}/, "Retry must atomically reject concurrent processing.");
assert.match(retryRoute, /processedKey === originalKey/, "Processed and original storage keys must be distinct.");
assert.match(retryRoute, /uploaded\.url === originalUrl/, "Processed and original URLs must be distinct.");
assert.match(retryRoute, /backgroundRemovalStatus": "completed"/, "Completion must be persisted only after processed upload succeeds.");
assert.match(retryRoute, /backgroundRemovalStatus": "failed"/, "Failures must be persisted honestly.");

const detail = source("components/wardrobe/WardrobeDetailClient.tsx");
assert.match(detail, /Retry background removal/, "Failed item UI must offer a retry.");
assert.match(detail, /window\.setInterval/, "Pending item UI must refresh until processing completes.");
const visualGrounding = source("lib/preview/visual-grounding.ts");
assert.match(visualGrounding, /variantUrl\(front, "cutout"\)/, "Virtual try-on must prefer a completed cutout.");

process.stdout.write("Wardrobe background-removal pipeline regression checks passed.\n");
