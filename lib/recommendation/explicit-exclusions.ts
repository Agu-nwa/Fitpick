import { metadataValue } from "@/lib/recommendation/scoring";
import { resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";

const EXCLUSION_CLAUSE = /\b(?:avoid|exclude|skip|without|do\s+not\s+(?:use|include|wear|recommend)|don['’]?t\s+(?:use|include|wear|recommend)|no)\b\s*([^.!?;\n]*?)(?=\b(?:avoid|exclude|skip|without|do\s+not|don['’]?t|no)\b|[.!?;\n]|$)/gi;
const IGNORED_WORDS = new Set([
  "a", "an", "and", "any", "from", "item", "items", "look", "my", "of", "or", "outfit",
  "piece", "pieces", "recent", "recently", "recommendation", "recommendations", "recommended",
  "repeat", "repeating", "same", "the", "this", "those", "use", "using", "wardrobe"
]);
const COLOR_WORDS = new Set([
  "beige", "black", "blue", "brown", "burgundy", "camel", "cream", "gold", "gray", "green",
  "grey", "ivory", "khaki", "navy", "orange", "pink", "purple", "red", "silver", "tan",
  "teal", "white", "yellow"
]);

function normalized(value: unknown) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value: unknown) {
  return normalized(value)
    .split(" ")
    .filter((token) => token.length > 1 && !IGNORED_WORDS.has(token))
    .map((token) => token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token);
}

function exclusionClauses(requestText = "") {
  const clauses: string[] = [];
  EXCLUSION_CLAUSE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EXCLUSION_CLAUSE.exec(requestText)) !== null) {
    const clause = normalized(match[1]);
    if (clause) clauses.push(clause);
  }
  return clauses;
}

function itemDescriptors(item: any) {
  const taxonomy = resolveCanonicalTaxonomy(item);
  return [
    item?.name,
    item?.color,
    item?.category,
    item?.subcategory,
    metadataValue(item, "primaryColor"),
    metadataValue(item, "garmentType"),
    taxonomy.canonicalSubtype,
    taxonomy.structureRole,
    taxonomy.stylingRole
  ].filter(Boolean);
}

function clauseExcludesItem(clause: string, item: any) {
  const name = normalized(item?.name);
  if (name.length >= 3 && clause.includes(name)) return true;

  const clauseTokens = new Set(meaningfulTokens(clause));
  const descriptorTokens = Array.from(new Set(itemDescriptors(item).flatMap(meaningfulTokens)));
  const matchedTokens = descriptorTokens.filter((token) => clauseTokens.has(token));
  const colorTokens = meaningfulTokens(item?.color || metadataValue(item, "primaryColor"));
  const typeTokens = descriptorTokens.filter((token) => !colorTokens.includes(token));
  const requestedColors = Array.from(clauseTokens).filter((token) => COLOR_WORDS.has(token));

  if (requestedColors.length && !requestedColors.some((token) => colorTokens.includes(token))) return false;

  // A type alone ("avoid trainers") is an explicit category/subtype exclusion.
  if (typeTokens.some((token) => clauseTokens.has(token))) {
    // For broad garment words, require the item's colour too when the clause names one.
    const clauseNamesColor = colorTokens.some((token) => clauseTokens.has(token));
    const broadType = matchedTokens.every((token) => ["top", "tops", "bottom", "bottoms", "outerwear", "accessories"].includes(token));
    return !broadType || clauseNamesColor;
  }

  return false;
}

export function resolveExplicitItemExclusions(requestText: string | undefined, wardrobeItems: any[]) {
  const clauses = exclusionClauses(requestText || "");
  if (!clauses.length) return { excludedItemIds: [] as string[], excludedItemLabels: [] as string[] };

  const excluded = wardrobeItems.filter((item) => clauses.some((clause) => clauseExcludesItem(clause, item)));
  return {
    excludedItemIds: excluded.map((item) => String(item?._id || item?.id || "")).filter(Boolean),
    excludedItemLabels: excluded.map((item) => String(item?.name || item?.subcategory || item?.category || "item"))
  };
}
