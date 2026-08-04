import assert from "node:assert/strict";
import {
  backgroundRemovalDisabledState,
  reportBackgroundRemovalDisabled
} from "../lib/image-processing/background-removal-state";

let warningCount = 0;
const originalWarn = console.warn;
console.warn = () => { warningCount += 1; };
try {
  assert.equal(reportBackgroundRemovalDisabled(), backgroundRemovalDisabledState);
  assert.equal(reportBackgroundRemovalDisabled(), backgroundRemovalDisabledState);
} finally {
  console.warn = originalWarn;
}
assert.equal(warningCount, 1, "disabled background removal emits one actionable warning per process");

console.log("Background-removal state tests passed.");
