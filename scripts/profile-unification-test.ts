import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(file: string) {
  return readFileSync(file, "utf8");
}

const bottomNav = read("components/navigation/BottomNav.tsx");
assert.ok(bottomNav.includes('{ label: "Profile", href: "/profile"'), "Bottom nav should use Profile as the canonical destination.");
assert.ok(!bottomNav.includes('{ label: "Avatar"'), "Bottom nav must not expose Avatar as a separate product destination.");
assert.ok(!bottomNav.includes('href: "/avatar"'), "Bottom nav must not link to /avatar.");

const desktopNav = read("components/navigation/DesktopNav.tsx");
assert.ok(!desktopNav.includes("/profile/preferences"), "Desktop nav must not expose Preferences as a separate destination.");
assert.ok(!desktopNav.includes('label: "Settings"'), "Desktop nav must not expose Settings as a separate profile destination.");

const mobileAccountNav = read("components/navigation/MobileAccountNav.tsx");
assert.ok(!mobileAccountNav.includes("/profile/preferences"), "Mobile top nav must not expose Preferences as a separate destination.");
assert.ok(!mobileAccountNav.includes('label: "Settings"'), "Mobile top nav must not expose Settings as a separate destination.");

const profilePage = read("app/profile/page.tsx");
assert.ok(profilePage.includes("UnifiedProfileClient"), "/profile should load the unified Profile client.");

const unifiedClient = read("components/profile/UnifiedProfileClient.tsx");
for (const required of ["Personal", "Appearance", "Style", "Location", "Credits", "Account"]) {
  assert.ok(unifiedClient.includes(required), `Unified Profile should include ${required}.`);
}
for (const integration of ["AvatarStudioClient", "StyleProfileForm", "LocationSelector", "WalletSummaryCard", "logout", "requestAccountDeletion"]) {
  assert.ok(unifiedClient.includes(integration), `Unified Profile should wire ${integration}.`);
}
assert.ok(!unifiedClient.includes("getNotificationPreferences"), "Unified Profile should not expose unused notification toggles.");
assert.ok(!unifiedClient.includes("updateNotificationPreferences"), "Unified Profile should not edit unused notification toggles.");

const avatarRedirect = read("app/avatar/page.tsx");
assert.ok(avatarRedirect.includes('redirect("/profile?section=appearance")'), "/avatar should redirect to Profile Appearance.");

const preferencesRedirect = read("app/profile/preferences/page.tsx");
assert.ok(preferencesRedirect.includes('redirect("/profile?section=style")'), "/profile/preferences should redirect to Profile Style.");

const styleRedirect = read("app/style-profile/page.tsx");
assert.ok(styleRedirect.includes('redirect("/profile?section=style")'), "/style-profile should redirect to Profile Style.");

const settingsRedirect = read("app/settings/page.tsx");
assert.ok(settingsRedirect.includes('redirect("/profile")'), "/settings should redirect to Profile.");

const preferencesTopRedirect = read("app/preferences/page.tsx");
assert.ok(preferencesTopRedirect.includes('redirect("/profile?section=style")'), "/preferences should redirect to Profile Style.");

const avatarForm = read("components/avatar/AvatarProfileForm.tsx");
assert.ok(avatarForm.includes("Upload full-body photo"), "Appearance should retain full-body model photo upload.");
assert.ok(avatarForm.includes("Generate model image"), "Appearance should retain generated model image support.");
assert.ok(avatarForm.includes("Fit details"), "Appearance should retain fit details.");
assert.ok(!avatarForm.includes("Custom model link"), "Appearance form should not expose custom model links.");
assert.ok(!avatarForm.includes("avatarProvider"), "Appearance form should not expose provider selection.");
assert.ok(!avatarForm.includes("Skip for now"), "Profile Appearance should not include onboarding skip controls.");

const styleForm = read("components/style-profile/StyleProfileForm.tsx");
for (const field of ["favoriteBrands", "dislikedBrands", "dislikedFits", "preferredCategories", "avoidedCategories"]) {
  assert.ok(styleForm.includes(field), `Style preferences should expose active scoring field ${field}.`);
}

const tryOnRoute = read("app/api/outfits/[id]/avatar-preview/route.ts");
assert.ok(tryOnRoute.includes('setupPath: "/profile?section=appearance"'), "Try-on setup should point to Profile Appearance.");

const stylistVisualization = read("lib/stylist/stylist-visualization.ts");
assert.ok(stylistVisualization.includes('setupPath: "/profile?section=appearance"'), "Stylist visualization setup should point to Profile Appearance.");

const homePage = read("app/home/page.tsx");
for (const removedCopy of ["Pick an outfit", "Check credits"]) {
  assert.ok(!homePage.includes(removedCopy), `Home page should not contain removed onboarding copy: ${removedCopy}.`);
}
assert.ok(homePage.includes("SimpleHomeActions") && homePage.includes("SimpleStartGuide"), "Home page should retain its simplified action flow.");

console.log("Profile unification regression check passed.");
