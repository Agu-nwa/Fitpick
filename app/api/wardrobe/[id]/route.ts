import { phasePlaceholder } from "@/lib/phase-placeholder";

export async function GET() {
  return phasePlaceholder("Wardrobe item detail");
}

export async function PATCH() {
  return phasePlaceholder("Wardrobe item update");
}

export async function DELETE() {
  return phasePlaceholder("Wardrobe item archive/delete");
}
