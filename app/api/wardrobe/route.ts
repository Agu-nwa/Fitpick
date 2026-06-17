import { phasePlaceholder } from "@/lib/phase-placeholder";

export async function GET() {
  return phasePlaceholder("Wardrobe list");
}

export async function POST() {
  return phasePlaceholder("Manual wardrobe item creation");
}
