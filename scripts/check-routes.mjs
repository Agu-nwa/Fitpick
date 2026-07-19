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
  "app/wallet/page.tsx",
  "app/wallet/payment/success/page.tsx",
  "app/profile/page.tsx",
  "app/profile/preferences/page.tsx",
  "app/plus/page.tsx",
  "app/states/page.tsx",
  "app/backend-ready/page.tsx",
  "app/frontend-complete/page.tsx",
  "app/login/page.tsx",
  "app/register/page.tsx",
  "app/admin/page.tsx",
];

const missing = required.filter((file) => !existsSync(file));

for (const file of required) {
  const route = file
    .replace(/^app/, "")
    .replace(/\/page\.tsx$/, "")
    .replace(/\/\[id\]/, "/[id]") || "/";
  console.log(`${existsSync(file) ? "FOUND" : "MISSING"} ${route} -> ${file}`);
}

if (missing.length) {
  console.error("Missing required frontend routes:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`FitPick route check passed: ${required.length} required route files found.`);
