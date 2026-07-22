import assert from "node:assert/strict";
import { cleanGarmentMeasurements, garmentMeasurementKeysForCategory, wardrobeCategoryRules } from "../lib/wardrobe/category-intelligence";
import { updateWardrobeItemSchema, uploadTagReviewSchema, wardrobeTagReviewSchema } from "../schemas/wardrobe.schema";

function parseUpload(payload: Record<string, unknown>) {
  return uploadTagReviewSchema.safeParse({
    name: "Test wardrobe item",
    category: "tops",
    color: "black",
    ...payload
  });
}

function expectStripped(payload: Record<string, unknown>, message: string) {
  const parsed = parseUpload(payload);
  assert.equal(parsed.success, true, message);
  if (parsed.success) assert.deepEqual(parsed.data.garmentMeasurements, {}, `${message}: measurements should be stripped`);
}

function expectMeasurements(payload: Record<string, unknown>, expected: Record<string, number>, message: string) {
  const parsed = parseUpload(payload);
  assert.equal(parsed.success, true, message);
  if (parsed.success) assert.deepEqual(parsed.data.garmentMeasurements, expected, `${message}: measurements should match category rules`);
}

assert.deepEqual(Object.keys(wardrobeCategoryRules).sort(), ["accessories", "bags", "bottoms", "dresses", "outerwear", "shoes", "tops"], "all backend categories must have central measurement rules");

expectStripped({
  category: "shoes",
  subcategory: "Sneakers",
  garmentMeasurements: {
    chestWidthCm: 0,
    shoulderWidthCm: 0,
    sleeveLengthCm: 0,
    bodyLengthCm: 0,
    shoeLengthCm: 28
  }
}, "shoe uploads must ignore garment body measurements");

const invalidShirt = parseUpload({
  category: "tops",
  subcategory: "Shirt",
  garmentMeasurements: {
    chestWidthCm: 0,
    shoulderWidthCm: 0,
    sleeveLengthCm: 0,
    bodyLengthCm: 0
  }
});
assert.equal(invalidShirt.success, false, "shirt uploads must still reject impossible body measurements");
if (!invalidShirt.success) {
  assert.ok(
    invalidShirt.error.issues.some((issue) => issue.path.join(".") === "garmentMeasurements.chestWidthCm"),
    "shirt validation should report the invalid chest measurement"
  );
}

const blankShirt = parseUpload({
  category: "tops",
  subcategory: "Shirt",
  garmentMeasurements: {
    chestWidthCm: "",
    shoulderWidthCm: ""
  }
});
assert.equal(blankShirt.success, true, "blank shirt measurement inputs should be omitted, not converted to zero");
if (blankShirt.success) assert.deepEqual(blankShirt.data.garmentMeasurements, {}, "blank shirt measurements should be omitted");

expectMeasurements({
  category: "tops",
  subcategory: "Shirt",
  garmentMeasurements: {
    chestWidthCm: 52,
    shoulderWidthCm: 46,
    waistCm: 0
  }
}, { chestWidthCm: 52, shoulderWidthCm: 46 }, "valid shirt measurements should pass while irrelevant keys are stripped");

expectMeasurements({
  category: "dresses",
  subcategory: "Dress",
  garmentMeasurements: {
    chestWidthCm: 44,
    waistCm: 74,
    inseamCm: 0
  }
}, { chestWidthCm: 44, waistCm: 74 }, "dress uploads should keep only dress-appropriate measurements");

expectStripped({
  category: "bags",
  subcategory: "Tote",
  garmentMeasurements: {
    chestWidthCm: 0,
    waistCm: 0
  }
}, "bag uploads must ignore garment body measurements");

expectStripped({
  category: "accessories",
  subcategory: "Sunglasses",
  garmentMeasurements: {
    chestWidthCm: 0,
    shoulderWidthCm: 0
  }
}, "sunglasses uploads must ignore garment body measurements");

[
  ["tops", "T-Shirt"],
  ["tops", "Polo"],
  ["outerwear", "Jacket"],
  ["outerwear", "Blazer"]
].forEach(([category, subcategory]) => {
  expectMeasurements({
    category,
    subcategory,
    garmentMeasurements: {
      chestWidthCm: 52,
      shoulderWidthCm: 46,
      sleeveLengthCm: 64,
      bodyLengthCm: 72,
      waistCm: 0
    }
  }, { chestWidthCm: 52, shoulderWidthCm: 46, sleeveLengthCm: 64, bodyLengthCm: 72 }, `${subcategory} should keep only top-body measurements`);
});

[
  ["bottoms", "Pants"],
  ["bottoms", "Trousers"],
  ["bottoms", "Shorts"],
  ["bottoms", "Skirt"]
].forEach(([category, subcategory]) => {
  expectMeasurements({
    category,
    subcategory,
    garmentMeasurements: {
      waistCm: 84,
      hipsCm: 98,
      inseamCm: 78,
      outseamCm: 104,
      chestWidthCm: 0
    }
  }, { waistCm: 84, hipsCm: 98, inseamCm: 78, outseamCm: 104 }, `${subcategory} should keep only bottom-body measurements`);
});

[
  ["shoes", "Boots"],
  ["shoes", "Sneakers"],
  ["shoes", "Sandals"],
  ["bags", "Crossbody"],
  ["accessories", "Belt"],
  ["accessories", "Hat"],
  ["accessories", "Jewelry"],
  ["accessories", "Watch"],
  ["accessories", "Scarf"]
].forEach(([category, subcategory]) => {
  expectStripped({
    category,
    subcategory,
    garmentMeasurements: {
      chestWidthCm: 0,
      shoulderWidthCm: 0,
      waistCm: 0,
      shoeLengthCm: 28,
      unknownCm: 99
    }
  }, `${subcategory} should not validate garment body measurements`);
});

assert.deepEqual(garmentMeasurementKeysForCategory("shoes", "Sneakers"), [], "shoes should not request garment body measurements");
assert.deepEqual(cleanGarmentMeasurements({ chestWidthCm: 52, shoeLengthCm: 28 }, "shoes", "Sneakers"), {}, "shoe clean-up should drop garment measurements");

const tagReviewShoe = wardrobeTagReviewSchema.safeParse({
  category: "shoes",
  subcategory: "Boots",
  garmentMeasurements: {
    chestWidthCm: 0,
    shoulderWidthCm: 0,
    shoeLengthCm: 28
  }
});
assert.equal(tagReviewShoe.success, true, "wardrobe tag review should strip irrelevant shoe measurements");
if (tagReviewShoe.success) assert.deepEqual(tagReviewShoe.data.garmentMeasurements, undefined);

const itemUpdateBag = updateWardrobeItemSchema.safeParse({
  category: "bags",
  subcategory: "Tote",
  garmentMeasurements: {
    waistCm: 0,
    chestWidthCm: 0
  }
});
assert.equal(itemUpdateBag.success, true, "wardrobe edit should strip irrelevant bag measurements");
if (itemUpdateBag.success) assert.deepEqual(itemUpdateBag.data.garmentMeasurements, undefined);

const itemUpdateInvalidTop = updateWardrobeItemSchema.safeParse({
  category: "tops",
  subcategory: "Jacket",
  garmentMeasurements: {
    chestWidthCm: 0
  }
});
assert.equal(itemUpdateInvalidTop.success, false, "wardrobe edit should still reject invalid top measurements");

console.log("Wardrobe upload validation regression checks passed.");
