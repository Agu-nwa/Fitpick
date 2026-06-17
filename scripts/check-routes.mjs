import { existsSync } from "node:fs";

const required = [
  "app/page.tsx",
  "app/onboarding/page.tsx",
  "app/home/page.tsx",
  "app/occasion/page.tsx",
  "app/wardrobe/page.tsx",
  "app/wardrobe/add/page.tsx",
  "app/wardrobe/[id]/page.tsx",
  "app/outfit/page.tsx",
  "app/outfit/[id]/page.tsx",
  "app/looks/page.tsx",
  "app/profile/page.tsx",
  "app/profile/preferences/page.tsx",
  "app/plus/page.tsx",
  "app/states/page.tsx",
  "app/backend-ready/page.tsx",
  "app/frontend-complete/page.tsx",
];

const missing = required.filter((file) => !existsSync(file));

if (missing.length) {
  console.error("Missing required frontend routes:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`FitPick route check passed: ${required.length} required route files found.`);
