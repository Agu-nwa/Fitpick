import assert from "node:assert/strict";
import { buildImageCandidates, safeImageFailureMetadata } from "@/lib/image-reliability";

const primary = "https://cdn.example.test/wardrobe/user/item-thumbnail.webp?signature=secret";
const original = "https://cdn.example.test/wardrobe/user/item.webp?signature=another-secret";

assert.deepEqual(buildImageCandidates(primary, original), [primary, original]);
assert.deepEqual(buildImageCandidates(primary, primary), [primary]);
assert.deepEqual(buildImageCandidates("", null), []);

const metadata = safeImageFailureMetadata({
  src: primary,
  context: "wardrobe card / unsafe context",
  attempt: 1,
  fallbackAvailable: true
});

assert.deepEqual(metadata, {
  context: "wardrobe_card___unsafe_context",
  host: "cdn.example.test",
  protocol: "https",
  attempt: 1,
  fallbackAvailable: true
});
assert.equal(JSON.stringify(metadata).includes("signature"), false);
assert.equal(JSON.stringify(metadata).includes("secret"), false);

const malformed = safeImageFailureMetadata({
  src: "http://[invalid-url",
  context: "preview",
  attempt: 0,
  fallbackAvailable: false
});

assert.equal(malformed.host, "invalid");
assert.equal(malformed.attempt, 1);

console.log("image reliability tests passed");
