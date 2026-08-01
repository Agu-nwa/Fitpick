import assert from "node:assert/strict";
import { classifyAccessoryImage, clearAccessoryImageClassificationCacheForTests } from "@/lib/wardrobe/accessory-image-classifier";

async function main() {
  clearAccessoryImageClassificationCacheForTests();
  const budget = { used: 0, maximum: 1 };
  let calls = 0;
  const classifier = async () => { calls += 1; return { subtype: "necklace" as const, confidence: 0.87, visibleEvidence: ["chain visible"], alternatives: [] }; };
  const disabled = await classifyAccessoryImage({ image: Buffer.from("a"), classifier, requestBudget: budget, enabled: false });
  assert.equal(disabled.status, "disabled");
  const first = await classifyAccessoryImage({ image: Buffer.from("a"), classifier, requestBudget: budget, enabled: true });
  assert.equal(first.status, "completed");
  assert.equal(first.cacheHit, false);
  const cached = await classifyAccessoryImage({ image: Buffer.from("a"), classifier, requestBudget: budget, enabled: true });
  assert.equal(cached.cacheHit, true);
  assert.equal(calls, 1);
  const limited = await classifyAccessoryImage({ image: Buffer.from("b"), classifier, requestBudget: budget, enabled: true });
  assert.equal(limited.status, "budget-exhausted");
  const failed = await classifyAccessoryImage({ image: Buffer.from("c"), classifier: async () => { throw new Error("provider"); }, requestBudget: { used: 0, maximum: 1 }, enabled: true });
  assert.equal(failed.status, "failed");
  process.stdout.write("Accessory image-classifier cache and cost-control checks passed.\n");
}
void main();
