import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { needsAccessorySubtypeConfirmation, resolveAccessorySubtype, userConfirmedResolution } from "@/lib/wardrobe/accessory-subtypes";

const item = (patch: Record<string, unknown> = {}) => ({ category: "accessories", name: "Gold Jewelry", subcategory: "Jewelry", ...patch });

const userConfirmed = item({ accessorySubtype: "watch", accessorySubtypeResolution: userConfirmedResolution("watch"), name: "Gold Necklace" });
assert.equal(resolveAccessorySubtype(userConfirmed).reasonCode, "user-confirmed");
assert.equal(resolveAccessorySubtype(userConfirmed).subtype, "watch");
assert.equal(needsAccessorySubtypeConfirmation(userConfirmed), false);

const canonical = item({ accessorySubtype: "necklace" });
assert.equal(resolveAccessorySubtype(canonical).reasonCode, "existing-canonical");
assert.equal(needsAccessorySubtypeConfirmation(canonical), false);

const agreeing = item({ name: "Gold Necklace", garmentType: "Necklace" });
assert.equal(resolveAccessorySubtype(agreeing).confidenceLevel, "high");
assert.equal(resolveAccessorySubtype(agreeing).reasonCode, "multiple-agreeing-signals");

const conflicting = item({ subcategory: "Watch", name: "Gold Necklace" });
assert.equal(resolveAccessorySubtype(conflicting).status, "conflicting");
assert.equal(resolveAccessorySubtype(conflicting).subtype, null);
assert.equal(needsAccessorySubtypeConfirmation(conflicting), true);

assert.equal(resolveAccessorySubtype(item()).confidenceLevel, "low");
assert.equal(resolveAccessorySubtype(item({ name: "Gold Necklace" })).subtype, "necklace");
assert.equal(resolveAccessorySubtype(item({ name: "Diamond Stud Earrings" })).subtype, "earrings");
const bangle = resolveAccessorySubtype(item({ name: "Silver Bangle Bracelet" }));
assert.equal(bangle.subtype, "bangle");
assert.ok(bangle.alternatives.some((entry) => entry.subtype === "bracelet"));
assert.equal(resolveAccessorySubtype(item({ name: "Leather Cuff Bracelet" })).subtype, "cuff");
assert.equal(resolveAccessorySubtype(item({ name: "Earring" })).subtype, "earrings");
assert.notEqual(resolveAccessorySubtype(item({ name: "Earring" })).subtype, "ring");
assert.equal(resolveAccessorySubtype(item({ name: "Silk hair tie" })).subtype, "hair-accessory");
assert.equal(resolveAccessorySubtype({ category: "bags", name: "shoe bag" }).subtype, null);

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const ui = source("components/wardrobe/WardrobeDetailClient.tsx");
assert.match(ui, /What type of accessory is this\?/);
assert.match(ui, /min-h-11/);
assert.match(ui, /Not sure/);
const route = source("app/api/wardrobe/[id]/accessory-subtype/route.ts");
assert.match(route, /userId: auth\.user\._id/);
assert.doesNotMatch(route, /admin|approve|reject/i);
const migration = source("scripts/backfill-accessory-subtypes.ts");
for (const option of ["flag(\"write\")", "confirm-production", "batch-size", "resume-from", "run-id", "min-confidence", "only-status", "sample"]) assert.ok(migration.includes(option), `migration must support ${option}`);

process.stdout.write("Accessory subtype confidence and owner-confirmation checks passed.\n");
