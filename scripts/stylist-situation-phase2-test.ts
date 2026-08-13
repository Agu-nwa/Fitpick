import assert from "node:assert/strict";
import { applySituationToStyleProfile, normalizeSituationContext } from "@/lib/recommendation/situation-context";

const wedding = normalizeSituationContext({
  message: "Dress me for an outdoor evening wedding with lots of walking. I want to look polished.",
  weatherAvailable: true,
  profile: { comfortPriority: "medium" }
});
assert.equal(wedding.occasionId, "wedding");
assert.equal(wedding.venue, "outdoor");
assert.equal(wedding.timeOfDay, "evening");
assert.equal(wedding.walkingRequirement, "high");
assert.equal(wedding.comfortPriority, "high");
assert.deepEqual(wedding.desiredImpression, ["polished"]);
assert.equal(wedding.clarificationQuestion, null);

const vagueEvent = normalizeSituationContext({ message: "Style me for an event", weatherAvailable: true });
assert.equal(vagueEvent.criticalMissing[0], "dressCode");
assert.match(vagueEvent.clarificationQuestion || "", /dress code/i);

const outdoorWithoutLocation = normalizeSituationContext({ message: "Dress me for an outdoor wedding", weatherAvailable: false });
assert.equal(outdoorWithoutLocation.criticalMissing[0], "weatherLocation");

const ordinaryRequest = normalizeSituationContext({ message: "Give me a casual weekend outfit", weatherAvailable: false });
assert.equal(ordinaryRequest.clarificationQuestion, null);

const contextual = applySituationToStyleProfile({
  preferredFits: ["tailored"],
  favoriteColors: ["black"],
  comfortPriority: "medium",
  contextualPreferences: [{ occasion: "wedding", preferredFits: ["flowing"], preferredColors: ["gold"], accessoryLevel: "expressive" }]
}, wedding);
assert.deepEqual(contextual.preferredFits, ["flowing", "tailored"]);
assert.deepEqual(contextual.favoriteColors, ["gold", "black"]);

console.log("Phase 2 situation-context tests passed.");
