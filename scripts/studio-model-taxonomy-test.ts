import assert from "node:assert/strict";
import { STUDIO_MODEL_APPEARANCE_VERSION, studioModelAppearanceSchema } from "../lib/studio-model/appearance-taxonomy";
import { buildStudioModelPrompt, studioModelAppearanceKey } from "../lib/studio-model/configuration";
import { listStudioModelIdentityReferences, resolveStudioModelIdentityReference } from "../lib/studio-model/identity-references";

const appearance = { version: STUDIO_MODEL_APPEARANCE_VERSION, representation: "studio_model", gender: "female", bodyType: "athletic", skinTone: "tone_10", undertone: "warm", hairTexture: "coily", hairLength: "long", hairColor: "black", hairStyle: "locs", heightBand: "tall" } as const;
assert.equal(studioModelAppearanceSchema.parse(appearance).skinTone, "tone_10");
assert.equal(studioModelAppearanceKey(appearance), studioModelAppearanceKey({ ...appearance }));
assert.notEqual(studioModelAppearanceKey(appearance), studioModelAppearanceKey({ ...appearance, skinTone: "tone_01" }));
assert.match(buildStudioModelPrompt(appearance), /fictional adult/);
assert.doesNotMatch(buildStudioModelPrompt(appearance), /race|ethnicity/i);
const femaleIdentity = resolveStudioModelIdentityReference(appearance);
assert.equal(femaleIdentity?.id, "female-primary-v1");
assert.match(buildStudioModelPrompt(appearance, femaleIdentity), /approved female-primary-v1 identity reference/);
assert.match(buildStudioModelPrompt(appearance, femaleIdentity), /Do not infer race, ethnicity/);
assert.equal(listStudioModelIdentityReferences().length, 2);
assert.equal(resolveStudioModelIdentityReference({ ...appearance, representation: "personal_digital_twin" }), null);
assert.throws(() => studioModelAppearanceSchema.parse({ ...appearance, hairTexture: "bald", hairStyle: "locs" }));
console.log("studio model taxonomy tests passed");
