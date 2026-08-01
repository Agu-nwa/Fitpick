import assert from "node:assert/strict";
import { accessorySubtypeFor, resolveAccessorySubtype } from "@/lib/wardrobe/accessory-subtypes";
import { accessoryRoleFor, selectAccessoryCompletion, validateAccessoryRoles } from "@/lib/recommendation/accessory-completion";
import { normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";
import { validateRecommendationCandidate } from "@/lib/recommendation/candidate-validator";
import { occasionProfiles } from "@/lib/recommendation/occasion-profiles";
import { outfitTemplates } from "@/lib/recommendation/outfit-templates";
import { generateCombinations } from "@/lib/recommendation/generator";

const accessory = (id: string, name: string, subtype?: string, extra: Record<string, unknown> = {}) => ({ _id: id, name, category: "accessories", subcategory: subtype || "Jewelry", accessorySubtype: subtype || null, color: "gold", condition: "ready", occasions: ["wedding", "dinner", "business"], formality: ["formal"], ...extra });

assert.equal(accessorySubtypeFor(accessory("1", "Gold Necklace")), "necklace");
assert.equal(resolveAccessorySubtype(accessory("2", "Gold Jewelry")).confidence, "ambiguous");
assert.equal(accessorySubtypeFor(accessory("3", "Diamond Stud Earrings")), "earrings");
assert.equal(accessorySubtypeFor(accessory("4", "Silver Bangle")), "bangle");
assert.equal(accessorySubtypeFor(accessory("5", "Leather Cuff")), "cuff");
assert.equal(accessorySubtypeFor(accessory("6", "Pendant Chain")), "pendant");
assert.equal(accessorySubtypeFor(accessory("7", "Misnamed Necklace", "watch")), "watch");
assert.equal(normalizeOutfitSlot({ category: "bags", name: "shoe bag" }), "bag");
assert.equal(normalizeOutfitSlot({ category: "accessories", name: "sneaker charm" }), "accessory");
assert.equal(normalizeOutfitSlot({ category: "tops", name: "shirt dress style" }), "top");

const watch = accessory("watch", "Slim gold watch", "watch");
const bangle = accessory("bangle", "Slim gold bangle", "bangle");
const cuff = accessory("cuff", "Large statement cuff", "cuff");
assert.equal(validateAccessoryRoles([watch, bangle]).valid, true);
assert.equal(validateAccessoryRoles([watch, accessory("watch2", "Second watch", "watch")]).valid, false);
assert.equal(validateAccessoryRoles([watch, cuff]).valid, false);
assert.equal(accessoryRoleFor(accessory("ear", "Diamond studs", "earrings")), "accent");

const top = { _id: "top", name: "Black blouse", category: "tops", color: "black", condition: "ready" };
const bottom = { _id: "bottom", name: "Black trousers", category: "bottoms", color: "black", condition: "ready" };
const shoe = { _id: "shoe", name: "Black heels", category: "shoes", color: "black", condition: "ready" };
assert.equal(validateRecommendationCandidate({ items: [top, shoe] }).rejectReason, "missing_bottom");
assert.equal(validateRecommendationCandidate({ items: [{ _id: "dress", name: "Dinner dress", category: "dresses" }, shoe] }).valid, true);

const wedding = occasionProfiles.find((profile) => profile.id === "wedding")!;
const completion = selectAccessoryCompletion({
  selectedItems: [top, bottom, shoe],
  wardrobeItems: [watch, bangle, accessory("neck", "Gold necklace", "necklace"), accessory("ear", "Gold earrings", "earrings")],
  occasionName: "Wedding",
  formality: "formal",
  repeatDays: 14,
  occasionProfile: wedding,
  outfitTemplate: outfitTemplates.wedding
});
assert.equal(completion.decision.status, "included");
assert.ok(completion.items.some((item) => ["necklace", "earrings"].includes(accessorySubtypeFor(item) || "")));
assert.ok(["ideal", "safe-fallback"].includes(completion.decision.selectionMode));

const shoes = Array.from({ length: 10 }, (_, index) => ({ _id: `shoe-${index}`, name: `Shoe ${index}`, category: "shoes", color: "black", condition: "ready" }));
const combinations = generateCombinations([top, bottom, ...shoes], ["tops", "bottoms", "shoes"], { maxCandidates: 60, wardrobeItems: [top, bottom, ...shoes] });
for (const ownedShoe of shoes) assert.ok(combinations.some((candidate) => candidate.items.some((item: { _id?: string }) => item._id === ownedShoe._id)), `${ownedShoe._id} must receive candidate coverage`);

process.stdout.write("Accessory taxonomy and recommendation regression checks passed.\n");
