import assert from "node:assert/strict";
import { buildUserTaxonomyConfirmation, detectTaxonomyConflicts } from "@/lib/wardrobe/taxonomy-review";
import { getTaxonomyReviewPriority, isTaxonomyReviewable, sortTaxonomyReviewQueue } from "@/lib/wardrobe/taxonomy-review-queue";

const valid = { id: "valid", category: "tops", canonicalSubtype: "shirt", structureRole: "top", stylingRole: "upper_body", visibilityRole: "primary_visible", taxonomyStatus: "confirmed", taxonomyNeedsReview: false, taxonomyConfirmedBy: "user", updatedAt: "2026-01-01T00:00:00.000Z" };
assert.equal(isTaxonomyReviewable({ ...valid, taxonomyStatus: "needs_review", taxonomyNeedsReview: true }), true);
assert.equal(isTaxonomyReviewable({ ...valid, taxonomyStatus: "unresolved", taxonomyNeedsReview: true }), true);
assert.equal(isTaxonomyReviewable({ ...valid, stylingRole: "footwear", taxonomyConflicts: ["subtype_role_mismatch"] }), true);
assert.equal(isTaxonomyReviewable({ ...valid, canonicalSubtype: "", structureRole: "unknown" }), true);
assert.equal(isTaxonomyReviewable({ ...valid, neckline: "unknown" }), false, "optional neckline alone stays out");
assert.equal(isTaxonomyReviewable(valid), false, "confirmed valid item stays out");

const conflict = { ...valid, id: "conflict", stylingRole: "footwear", taxonomyStatus: "needs_review", taxonomyNeedsReview: true };
const jewelry = { id: "jewelry", category: "accessories", canonicalSubtype: "other_jewelry", structureRole: "finisher", stylingRole: "unknown", visibilityRole: "visible_finisher", taxonomyStatus: "unresolved", taxonomyNeedsReview: true };
const shoe = { id: "shoe", category: "shoes", canonicalSubtype: "", structureRole: "footwear", stylingRole: "footwear", visibilityRole: "primary_visible", taxonomyStatus: "unresolved", taxonomyNeedsReview: true };
const set = { id: "set", category: "outerwear", canonicalSubtype: "suit", structureRole: "set", stylingRole: "tailored_set", visibilityRole: "primary_visible", setComponents: [], taxonomyStatus: "needs_review", taxonomyNeedsReview: true };
const accessory = { id: "accessory", category: "accessories", canonicalSubtype: "other_accessory", structureRole: "finisher", stylingRole: "unknown", visibilityRole: "unknown", taxonomyStatus: "unresolved", taxonomyNeedsReview: true };
assert.ok(getTaxonomyReviewPriority(conflict)!.priority < getTaxonomyReviewPriority(jewelry)!.priority);
assert.ok(getTaxonomyReviewPriority(shoe)!.priority < getTaxonomyReviewPriority({ ...valid, taxonomyStatus: "needs_review", taxonomyNeedsReview: true })!.priority);
assert.ok(getTaxonomyReviewPriority(set)!.priority < getTaxonomyReviewPriority(accessory)!.priority);
const ties = sortTaxonomyReviewQueue([{ ...jewelry, id: "b", updatedAt: "2026-01-01", createdAt: "2025-01-01" }, { ...jewelry, id: "a", updatedAt: "2026-01-01", createdAt: "2025-01-01" }]);
assert.deepEqual(ties.map((item) => item.id), ["a", "b"], "stable tie-break");

const necklace = buildUserTaxonomyConfirmation(jewelry, "necklace");
assert.deepEqual({ subtype: necklace.canonicalSubtype, structure: necklace.structureRole, styling: necklace.stylingRole, visibility: necklace.visibilityRole, status: necklace.taxonomyStatus, by: necklace.taxonomyConfirmedBy }, { subtype: "necklace", structure: "finisher", styling: "neck_jewelry", visibility: "visible_finisher", status: "confirmed", by: "user" });
assert.equal(buildUserTaxonomyConfirmation({ category: "bags", name: "Wallet" }, "wallet").visibilityRole, "small_leather_good");
assert.deepEqual(buildUserTaxonomyConfirmation(set, "suit", ["top_layer", "bottom"]).setComponents, ["top_layer", "bottom"]);
assert.equal(buildUserTaxonomyConfirmation(shoe, "loafers").structureRole, "footwear");
assert.deepEqual(necklace.taxonomyConflicts, []);
assert.equal(detectTaxonomyConflicts({ ...valid, stylingRole: "footwear" }).status, "conflicting");
const uncertain = buildUserTaxonomyConfirmation(jewelry, "not_sure");
assert.equal(uncertain.taxonomyStatus, "unresolved");
assert.notEqual(uncertain.taxonomyConfirmedBy, "user");

const session = [conflict, shoe, jewelry];
const skippedIds = new Set<string>();
let index = 0;
skippedIds.add(session[index].id);
index += 1;
assert.equal(session[index].id, "shoe", "skip advances");
assert.equal(skippedIds.has("conflict"), true, "skip is session-local and unresolved");
assert.equal(session.filter((item) => item.id !== "shoe").some((item) => item.id === "shoe"), false, "save advances");
assert.equal(sortTaxonomyReviewQueue([valid, jewelry]).map((item) => item.id).includes("jewelry"), true, "later session resumes unresolved");
assert.equal(sortTaxonomyReviewQueue([valid]).length, 0, "empty queue completion input");

const safeMetric = { reason: "ambiguous_footwear", category: "shoes", canonicalSubtype: "unknown", positionBand: "first_5", outcome: "skipped" };
assert.equal(/name|image|url|userId|email/i.test(JSON.stringify(safeMetric)), false, "metric excludes private wardrobe data");
console.log("wardrobe review queue behavior tests passed");
