import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(file: string) {
  return readFileSync(file, "utf8");
}

const stylistPage = read("app/stylist/page.tsx");
assert.ok(stylistPage.includes('title="Your AI fashion studio."'), "Stylist page should use the current editorial header.");
assert.ok(stylistPage.includes("Create from your closet, or style a piece you admire with what you already own."), "Stylist page should explain the two closet-first flows.");
assert.ok(stylistPage.includes("Create from your closet."), "Stylist page should lead to Create a Look.");
assert.ok(stylistPage.includes("Style a look you admire."), "Stylist page should lead to Match an Outfit.");
assert.ok(!stylistPage.includes("Ask for the look. MyFitPick styles the closet."), "Stylist page should not use the old bulky chatbot-style hero headline.");
assert.ok(!stylistPage.includes("Tell the stylist the occasion, mood, weather, and dress code."), "Stylist page should not lead with a long chat-style intro.");

const stylistChat = read("components/stylist/StylistChat.tsx");
const stylistRoute = read("app/api/stylist/chat/route.ts");
const stylistVisualization = read("lib/stylist/stylist-visualization.ts");
assert.ok(stylistChat.includes('type StylistFlow = "home" | "create" | "match"'), "Stylist should have explicit product flow state.");
assert.ok(stylistChat.includes('title="Create a Look"'), "Create a Look must be a primary product card.");
assert.ok(stylistChat.includes('title="Match an Outfit"'), "Match an Outfit must be a primary product card.");
assert.ok(stylistChat.includes("Upload inspiration and build a look from your closet."), "Match Outfit card should explain the reference matching value.");
assert.ok(stylistChat.includes("MatchFlowVisual"), "Match Outfit should show a compact visual flow.");
assert.ok(stylistChat.includes("DetectedPiecesPanel"), "Match workspace should show detected pieces.");
assert.ok(stylistChat.includes("Upload inspiration"), "Match workspace should include a clear upload action.");
assert.ok(stylistChat.includes("MyFitPick is finding closet matches."), "Match workspace should expose a clear generation state.");
assert.ok(stylistChat.includes("buildOutfitPresentationItems(outfit, reference)"), "Match recommendation collages must include the uploaded reference anchor.");
assert.ok(stylistChat.includes("Uploaded item"), "The uploaded reference must be visibly distinguished from closet-owned items.");
assert.ok(!stylistChat.includes("Match photo"), "Old Match photo chip copy should be removed.");
assert.ok(!stylistChat.includes("Improve size details"), "Try-on setup should not expose removed measurement language.");
assert.ok(!stylistChat.includes("Avatar preview"), "Stylist UI should use Virtual Try-On language instead of chatbot-era avatar preview copy.");
assert.ok(stylistChat.includes("Describe it. I&apos;ll style it."), "Stylist chat should use the focused agent empty state.");
assert.ok(stylistChat.includes("In this chat"), "Stylist chat should truthfully label the current in-memory prompt history.");
assert.ok(!stylistChat.includes("window.location.reload()"), "Starting a new conversation must not reload the full page.");
assert.ok(stylistChat.includes("Try this outfit on · {virtualTryOnCreditCost} Credits"), "A completed recommendation must expose an explicit credit-labelled Try-On action.");
assert.ok(!stylistChat.includes("setIncludeVisualization"), "Recommendation creation must not expose an auto Try-On toggle.");
assert.ok(stylistChat.includes("includeVisualization: false"), "Recommendation regeneration must not automatically request Try-On.");
assert.ok(stylistVisualization.includes("options.includeVisualization !== true"), "The server must require explicit Try-On consent.");
assert.ok(stylistRoute.includes("} else if (hasOutfit) {"), "Outfits must still be persisted when automatic visualization is disabled.");
assert.ok(stylistChat.includes("renderLookStudio(entry)"), "Generated looks should render with the assistant entry that produced them.");
assert.ok(stylistChat.includes("Add image"), "The agent composer should expose image attachments.");
assert.ok(!stylistChat.includes("occasionSuggestions"), "Stylist chat should not show initial occasion suggestions.");
assert.ok(!stylistChat.includes("promptSuggestions"), "Stylist chat should not show initial prompt suggestions.");
assert.ok(!stylistChat.includes("createLookExamples"), "Stylist chat should not rotate initial prompt examples.");

console.log("Stylist UI redesign checks passed.");
