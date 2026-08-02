import assert from "node:assert/strict";
import { safeStudioModelEvent } from "../lib/studio-model/observability";

const event = safeStudioModelEvent("appearance_updated", { appearanceKey: "sm_123", source: "profile", completed: true });
assert.deepEqual(Object.keys(event).sort(), ["appearanceKey", "completed", "event", "source"]);
assert.equal(JSON.stringify(event).includes("skinTone"), false);
assert.equal(JSON.stringify(event).includes("hairColor"), false);
console.log("studio model profile tests passed");
