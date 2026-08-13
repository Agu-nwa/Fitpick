import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(file: string) {
  return readFileSync(file, "utf8");
}

const stylist = read("components/stylist/StylistChat.tsx");
const looksPage = read("app/looks/page.tsx");
const historyClient = read("components/outfit/TryOnHistoryClient.tsx");
const historyRoute = read("app/api/tryon-history/route.ts");
const supportLauncher = read("components/support/SupportLauncher.tsx");

const composerStart = stylist.indexOf('<form className="relative z-10 mb-8 px-1"');
const contentStart = stylist.indexOf('<div className="flex-1 px-1 pb-8">');
assert.ok(composerStart > 0, "The Stylist composer should participate in normal document flow.");
assert.ok(composerStart < contentStart, "The normal-flow composer should follow the introduction and precede active content.");
assert.ok(!stylist.includes('form className="sticky bottom-'), "The composer must not become a mobile overlay again.");
assert.ok(supportLauncher.includes('pathname === "/stylist/create-look"'), "The support launcher must yield to the Create a Look composer.");
assert.ok(supportLauncher.includes('pathname === "/stylist/match"'), "The support launcher must yield to the Match composer.");

assert.ok(looksPage.includes("Try-On History"), "/looks must identify itself as Try-On History.");
assert.ok(looksPage.includes("TryOnHistoryClient"), "/looks must use Try-On history rather than saved outfit cards.");
assert.ok(!looksPage.includes("SavedLooksClient"), "/looks must not load the saved recommendations collection.");
assert.ok(historyClient.includes("grid-cols-2"), "Try-On history should use a compact mobile image grid.");
assert.ok(historyClient.includes("No try-ons yet"), "Try-On history needs a purposeful empty state.");
assert.ok(historyClient.includes("Try on a look"), "The empty state needs a route into the existing styling flow.");
assert.ok(historyRoute.includes("userId: auth.user._id"), "Try-On history queries must be scoped to the authenticated owner.");
assert.ok(historyRoute.includes('status: "completed"'), "Try-On history must only return completed generations.");
assert.ok(historyRoute.includes("completedAt: -1"), "Try-On history must return newest results first.");

console.log("Try-On history and mobile composer UI checks passed.");
