import assert from "node:assert/strict";
import { parseStylistRequestIntent, resolveCanonicalOccasionIntent } from "../lib/recommendation/occasion-intent";

const wedding = resolveCanonicalOccasionIntent("I am going for a friend's wedding. Style me.");
assert.equal(wedding.id, "wedding");
assert.equal(wedding.label, "Wedding Guest");
assert.notEqual(wedding.label, "I am going for a friend's wedding. Style me.", "raw request text is never reused as the title occasion");
const parsedWedding = parseStylistRequestIntent("I am going for a friend's wedding. Style me.");
assert.equal(parsedWedding.requestText, "I am going for a friend's wedding. Style me.");
assert.deepEqual(parsedWedding.styleDirections, [], "style direction remains a separate field");

const interview = resolveCanonicalOccasionIntent("What should I wear to my interview tomorrow?");
assert.equal(interview.id, "interview");
assert.equal(interview.label, "Interview");

const unspecified = resolveCanonicalOccasionIntent("Style me using something I have not worn recently");
assert.equal(unspecified.id, "everyday");
assert.equal(unspecified.detected, false);

console.log("Occasion intent tests passed.");
