import assert from "node:assert/strict";
import { buildTryOnHistory, serializeTryOnHistoryItem } from "@/lib/tryon/tryon-history";

const originalCloudFront = process.env.CLOUDFRONT_PUBLIC_URL;
process.env.CLOUDFRONT_PUBLIC_URL = "https://cdn.example.com";

const completed = {
  generationId: "generation-new",
  outfitId: "outfit-1",
  status: "completed",
  storageKey: "generated-previews/user/preview.webp",
  previewUrl: "https://temporary.example.com/signed.webp?token=secret",
  completedAt: "2026-08-13T10:00:00.000Z"
};

assert.deepEqual(serializeTryOnHistoryItem(completed), {
  generationId: "generation-new",
  outfitId: "outfit-1",
  previewUrl: "https://cdn.example.com/generated-previews/user/preview.webp",
  completedAt: "2026-08-13T10:00:00.000Z"
});
assert.equal(serializeTryOnHistoryItem({ ...completed, status: "failed" }), null);
assert.equal(serializeTryOnHistoryItem({ ...completed, generationId: "", storageKey: "", previewUrl: "" }), null);

const history = buildTryOnHistory([
  completed,
  { ...completed, generationId: "duplicate", completedAt: "2026-08-12T10:00:00.000Z" },
  { ...completed, generationId: "generation-old", storageKey: "generated-previews/user/older.webp", completedAt: "2026-08-11T10:00:00.000Z" }
]);
assert.deepEqual(history.map((item) => item.generationId), ["generation-new", "generation-old"]);

if (originalCloudFront === undefined) delete process.env.CLOUDFRONT_PUBLIC_URL;
else process.env.CLOUDFRONT_PUBLIC_URL = originalCloudFront;

console.log("Try-On history serialization checks passed.");
