import assert from "node:assert/strict";
import { STUDIO_MODEL_APPEARANCE_VERSION } from "../lib/studio-model/appearance-taxonomy";
import { studioModelAppearanceKey } from "../lib/studio-model/configuration";
import { resolveStudioModelForProfile } from "../lib/studio-model/model-resolver";

const configuration = { version: STUDIO_MODEL_APPEARANCE_VERSION, representation: "studio_model", gender: "male", bodyType: "broad", skinTone: "tone_09", hairTexture: "coily", hairLength: "short", hairColor: "black", hairStyle: "short_natural" } as const;
const fallback = resolveStudioModelForProfile({ studioModelConfiguration: configuration });
assert.equal(fallback.source, "legacy_compatible");
assert.equal(fallback.exactAppearance, false);
assert.match(fallback.imageUrl || "", /male-broad/);

const exact = resolveStudioModelForProfile({ studioModelConfiguration: configuration, studioModelAppearanceKey: studioModelAppearanceKey(configuration), studioModelAssetStatus: "ready", studioModelImageUrl: "https://assets.example/model.png" });
assert.equal(exact.source, "exact_asset");
assert.equal(exact.exactAppearance, true);
assert.equal(exact.imageUrl, "https://assets.example/model.png");

const stale = resolveStudioModelForProfile({ ...configuration, studioModelConfiguration: configuration, studioModelAppearanceKey: "stale", studioModelAssetStatus: "ready", studioModelImageUrl: "https://assets.example/stale.png" });
assert.notEqual(stale.imageUrl, "https://assets.example/stale.png");
console.log("studio model resolver tests passed");
