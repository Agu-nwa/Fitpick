export type ReadinessItem = {
  id: string;
  area: string;
  status: "complete" | "ready-for-backend" | "frontend-only";
  detail: string;
};

export const frontendReadiness: ReadinessItem[] = [
  {
    id: "mobile-shell",
    area: "Mobile-first app shell",
    status: "complete",
    detail: "Safe-area mobile shell, centered desktop preview, bottom navigation, skip link, and PWA manifest foundation are in place.",
  },
  {
    id: "core-routes",
    area: "Core routes",
    status: "complete",
    detail: "Onboarding, Home, Occasion, Wardrobe, Add Clothes, Item Detail, Outfit, Outfit Detail, Outfit Preview, Wallet, Profile, Preferences, States, and Backend Ready routes are present.",
  },
  {
    id: "design-system",
    area: "Design system",
    status: "complete",
    detail: "Reusable cards, chips, buttons, CTA bars, status badges, empty states, error states, permission states, premium locks, sheets, upload, wardrobe, and outfit components are structured.",
  },
  {
    id: "state-data",
    area: "Reference state data",
    status: "complete",
    detail: "Empty, error, permission, credit, wardrobe, outfit, and account states are separated into typed UI data for QA review.",
  },
  {
    id: "outfit-flow",
    area: "Outfit decision flow",
    status: "complete",
    detail: "The occasion-first path leads to outfit recommendation, reason chips, detail explanation, swap sheet, save/wear/rate actions, and history memory.",
  },
  {
    id: "upload-flow",
    area: "Wardrobe upload flow",
    status: "complete",
    detail: "Upload UI, photo guidance, secure image upload access, AI tag review, manual correction, and item detail patterns are wired to production routes.",
  },
  {
    id: "states",
    area: "State handling",
    status: "complete",
    detail: "Loading, empty, error, offline, permission-denied, not-enough-items, and premium-locked states are visible and reusable.",
  },
  {
    id: "accessibility",
    area: "Accessibility",
    status: "complete",
    detail: "Touch targets, focus rings, skip link, reduced-motion support, readable labels, semantic buttons, and body-safe copy rules are included.",
  },
  {
    id: "api-contract",
    area: "Backend API contract",
    status: "ready-for-backend",
    detail: "Initial API contract map is documented for wardrobe, upload, tag review, recommendation, feedback, wallet, and Credit purchase endpoints.",
  },
];

export const backendHandoffAreas = [
  "Authentication and user accounts",
  "Wardrobe photo upload and storage",
  "AI/manual clothing tag extraction",
  "Occasion and style preference persistence",
  "Outfit recommendation engine",
  "Outfit history, worn tracking, and ratings",
  "MyFitPick Credit wallet and usage status",
  "Notifications, privacy settings, and audit-safe data handling",
];
