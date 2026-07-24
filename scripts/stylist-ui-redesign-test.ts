import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(file: string) {
  return readFileSync(file, "utf8");
}

const stylistPage = read("app/stylist/page.tsx");
assert.ok(stylistPage.includes("Your Stylist"), "Stylist page should use the minimal editorial header.");
assert.ok(stylistPage.includes("Build a look, recreate an outfit, or get styled from your wardrobe."), "Stylist page should explain the product in one concise line.");
assert.ok(!stylistPage.includes("Ask for the look. MyFitPick styles the closet."), "Stylist page should not use the old bulky chatbot-style hero headline.");
assert.ok(!stylistPage.includes("Tell the stylist the occasion, mood, weather, and dress code."), "Stylist page should not lead with a long chat-style intro.");

const stylistChat = read("components/stylist/StylistChat.tsx");
assert.ok(stylistChat.includes('type StylistFlow = "home" | "create" | "match"'), "Stylist should have explicit product flow state.");
assert.ok(stylistChat.includes('title="Create a Look"'), "Create a Look must be a primary product card.");
assert.ok(stylistChat.includes('title="Match an Outfit"'), "Match an Outfit must be a primary product card.");
assert.ok(stylistChat.includes("Upload or share a fashion reference"), "Match Outfit card should explain the reference matching value.");
assert.ok(stylistChat.includes("MatchFlowVisual"), "Match Outfit should show a compact visual flow.");
assert.ok(stylistChat.includes("Reference look") && stylistChat.includes("Closet matches") && stylistChat.includes("FitPick version"), "Match visual should show reference-to-closet-to-result steps.");
assert.ok(stylistChat.includes("DetectedPiecesPanel"), "Match workspace should show detected pieces.");
assert.ok(stylistChat.includes("WardrobeMatchPanel"), "Match workspace should show wardrobe match status.");
assert.ok(stylistChat.includes("Upload reference"), "Match workspace should include a clear upload action.");
assert.ok(stylistChat.includes("Build matched look"), "Match workspace should generate the recreated outfit.");
assert.ok(stylistChat.includes("What are you dressing for today?"), "Occasion prompt should still exist inside Create Look.");
assert.ok(stylistChat.indexOf("What are you dressing for today?") > stylistChat.indexOf('activeFlow === "create"'), "Occasion prompt must only appear inside Create Look flow.");
assert.ok(!stylistChat.includes("Match photo"), "Old Match photo chip copy should be removed.");
assert.ok(!stylistChat.includes("Improve size details"), "Try-on setup should not expose removed measurement language.");
assert.ok(!stylistChat.includes("Avatar preview"), "Stylist UI should use Virtual Try-On language instead of chatbot-era avatar preview copy.");
assert.ok(stylistChat.includes("This is a preview, not a perfect fitting."), "Try-on preview trust copy should remain user-facing and simple.");

console.log("Stylist UI redesign checks passed.");
