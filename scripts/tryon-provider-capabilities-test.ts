import assert from "node:assert/strict";
import { buildTryOnFidelity, getTryOnProviderCapabilities, prepareTryOnItems } from "../lib/tryon/provider-capabilities";

const reference = { _id: "reference-shoe", category: "shoes", canonicalSubtype: "loafers", name: "Reference loafers" };
const top = { _id: "top", category: "tops", canonicalSubtype: "shirt", name: "Shirt" };
const bottom = { _id: "bottom", category: "bottoms", canonicalSubtype: "trousers", name: "Trousers" };
const coat = { _id: "coat", category: "outerwear", canonicalSubtype: "coat", name: "Coat" };
const bag = { _id: "bag", category: "bags", canonicalSubtype: "handbag", name: "Bag" };
const watch = { _id: "watch", category: "accessories", canonicalSubtype: "watch", name: "Watch" };
const necklace = { _id: "necklace", category: "accessories", canonicalSubtype: "necklace", name: "Necklace" };

const capabilities = getTryOnProviderCapabilities("fashn");
assert.equal(capabilities.footwear, "partial", "FASHN footwear is conservatively partial");
assert.equal(capabilities.bags, "unsupported", "FASHN bag rendering is not promised");
assert.equal(capabilities.watches, "unsupported", "FASHN watch rendering is not promised");

const prepared = prepareTryOnItems({ provider: "fashn", items: [top, bottom, coat, bag, watch, necklace, reference], referenceItemIds: ["reference-shoe"], maximumItems: 4 });
assert.equal(prepared.sentItemIds[0], "reference-shoe", "reference item has stable first priority");
assert.ok(prepared.sentItemIds.includes("top") && prepared.sentItemIds.includes("bottom"), "core garments are sent");
assert.ok(prepared.recommendationOnlyItemIds.includes("bag") && prepared.recommendationOnlyItemIds.includes("watch"), "unsupported details remain recommendation-only");
assert.equal(prepared.sentItemIds.length, 4, "provider item limit is respected");
assert.equal(prepared.fidelity.previewFidelityLevel, "core_only", "unsupported small roles produce a successful core-only fidelity classification");
assert.deepEqual(buildTryOnFidelity("fashn", [top, bottom]).unsupportedRoles, [], "complete core garment set has no unsupported role");
console.log("Try-on provider capability checks passed.");
