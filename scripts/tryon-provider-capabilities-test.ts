import assert from "node:assert/strict";
import { buildTryOnFidelity, getTryOnProviderCapabilities, prepareTryOnItems } from "../lib/tryon/provider-capabilities";

const reference = { _id: "reference-shoe", category: "shoes", canonicalSubtype: "loafers", name: "Reference loafers" };
const top = { _id: "top", category: "tops", canonicalSubtype: "shirt", name: "Shirt" };
const bottom = { _id: "bottom", category: "bottoms", canonicalSubtype: "trousers", name: "Trousers" };
const coat = { _id: "coat", category: "outerwear", canonicalSubtype: "coat", name: "Coat" };
const bag = { _id: "bag", category: "bags", canonicalSubtype: "handbag", name: "Bag" };
const watch = { _id: "watch", category: "accessories", canonicalSubtype: "watch", name: "Watch" };
const necklace = { _id: "necklace", category: "accessories", canonicalSubtype: "necklace", name: "Necklace" };
const belt = { _id: "belt", category: "accessories", canonicalSubtype: "belt", name: "Leather belt" };

const capabilities = getTryOnProviderCapabilities("fashn");
assert.equal(capabilities.footwear, "partial", "FASHN footwear is conservatively partial");
assert.equal(capabilities.bags, "partial", "FASHN Try-On Max can attempt bag rendering without promising pixel visibility");
assert.equal(capabilities.watches, "partial", "FASHN Try-On Max can attempt watch rendering without promising pixel visibility");
assert.equal(capabilities.accessories, "partial", "Generic finishers such as belts remain eligible for a bounded provider pass");

const prepared = prepareTryOnItems({ provider: "fashn", items: [top, bottom, coat, bag, watch, necklace, reference], referenceItemIds: ["reference-shoe"], maximumItems: 7, maximumFinishers: 2 });
assert.equal(prepared.sentItemIds[0], "reference-shoe", "reference item has stable first priority");
assert.ok(prepared.sentItemIds.includes("top") && prepared.sentItemIds.includes("bottom"), "core garments are sent");
assert.ok(prepared.sentItemIds.includes("bag") && prepared.sentItemIds.includes("watch"), "a bag and one visible accessory are sent as bounded finishing passes");
assert.ok(prepared.recommendationOnlyItemIds.includes("necklace"), "additional finishers remain in the recommendation when the provider finisher budget is reached");
assert.equal(prepared.sentItemIds.length, 6, "core, outerwear, footwear, and two bounded finishers are retained");
assert.equal(prepared.fidelity.previewFidelityLevel, "partial", "partially supported finishing roles produce an honest partial fidelity classification");
assert.deepEqual(buildTryOnFidelity("fashn", [top, bottom]).unsupportedRoles, [], "complete core garment set has no unsupported role");
assert.equal(buildTryOnFidelity("fashn", [belt]).partiallySupportedRoles[0], "accessories", "generic accessory taxonomy maps to a provider-visible role");
console.log("Try-on provider capability checks passed.");
