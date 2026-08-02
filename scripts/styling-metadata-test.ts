import assert from "node:assert/strict";
import { updateWardrobeItemSchema } from "../schemas/wardrobe.schema";

const base = { category: "tops" as const, name: "Top" };
assert.equal(updateWardrobeItemSchema.parse({ ...base, neckline: "v_neck" }).neckline, "v_neck", "13 V-neck is structured");
assert.equal(updateWardrobeItemSchema.parse({ category: "bottoms", name: "Trousers", waistbandType: "belt_loops", beltCompatible: true }).beltCompatible, true, "14 belt loops support belts");
assert.equal(updateWardrobeItemSchema.parse({ category: "bottoms", name: "Joggers", waistbandType: "elastic", beltCompatible: false }).beltCompatible, false, "15 elastic waist can reject belts");
assert.equal(updateWardrobeItemSchema.parse({ ...base, cuffType: "french_cuff" }).cuffType, "french_cuff", "16 French cuff is stored");
assert.equal(updateWardrobeItemSchema.parse({ ...base, cuffType: "standard" }).cuffType, "standard", "17 standard cuff is stored");
assert.equal(updateWardrobeItemSchema.parse({ category: "accessories", name: "Earrings", accessoryScale: "statement" }).accessoryScale, "statement", "18 accessory scale is stored");
assert.equal(updateWardrobeItemSchema.safeParse({ category: "shoes", name: "Shoes" }).success, true, "19 styling metadata remains optional");
console.log("Styling metadata checks passed.");
