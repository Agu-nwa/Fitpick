import assert from "node:assert/strict";
import { buildCandidateDecisionEvidence, evaluateFitAndProportion } from "@/lib/recommendation/candidate-decision";

const tailored = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Navy tailored trousers", category: "bottoms", garmentFit: "tailored" };
const relaxed = { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Cream relaxed shirt", category: "tops", garmentFit: "relaxed" };
const loafers = { _id: "cccccccccccccccccccccccc", name: "Brown loafers", category: "shoes", garmentFit: "regular" };
const stilettos = { _id: "dddddddddddddddddddddddd", name: "High stiletto heels", category: "shoes", garmentFit: "regular" };

const practicalFit = evaluateFitAndProportion([tailored, relaxed, loafers], { activeSituation: { walkingRequirement: "high" } });
assert.ok(practicalFit.confidence >= 0.8);
assert.ok(practicalFit.evidence.some((entry) => /walking/i.test(entry)));

const impracticalFit = evaluateFitAndProportion([tailored, relaxed, stilettos], { activeSituation: { walkingRequirement: "high" } });
assert.ok(impracticalFit.warnings.some((entry) => /walking/i.test(entry)));
assert.ok(impracticalFit.confidence < practicalFit.confidence);

const decision = buildCandidateDecisionEvidence([
  {
    items: [tailored, relaxed, loafers],
    score: 180,
    scoreBreakdown: { occasionFit: 30, colorHarmony: 20, silhouetteBalance: 18, comfort: 16 }
  },
  {
    items: [tailored, relaxed, stilettos],
    score: 168,
    scoreBreakdown: { occasionFit: 27, colorHarmony: 20, silhouetteBalance: 18, comfort: 8 }
  }
], { activeSituation: { walkingRequirement: "high" } });

assert.equal(decision.finalists.length, 2);
assert.equal(decision.finalists[0].rank, 1);
assert.equal(decision.decisiveDimensions[0].key, "comfort");
assert.match(decision.runnerUpTradeoff, /comfort/i);
assert.ok(decision.selectionReasons.length > 0);

console.log("Phase 3 candidate-decision tests passed.");
