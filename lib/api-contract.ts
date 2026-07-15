export type ApiContract = {
  id: string;
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  status: "ready" | "planned";
  description: string;
};

export const apiContracts: ApiContract[] = [
  {
    id: "wardrobe-list",
    name: "Wardrobe list",
    method: "GET",
    path: "/api/wardrobe",
    status: "ready",
    description: "Returns the user's wardrobe items with category, color, tags, condition, and worn history.",
  },
  {
    id: "wardrobe-upload",
    name: "Wardrobe upload",
    method: "POST",
    path: "/api/wardrobe/upload",
    status: "planned",
    description: "Accepts clothing photos and returns upload records for AI/manual tag review.",
  },
  {
    id: "tag-review",
    name: "Tag review",
    method: "PATCH",
    path: "/api/wardrobe/:id/tags",
    status: "ready",
    description: "Saves category, color, pattern, formality, occasion, weather, and condition tags.",
  },
  {
    id: "recommendation",
    name: "Outfit recommendation",
    method: "POST",
    path: "/api/outfits/recommend",
    status: "planned",
    description: "Builds outfit suggestions from occasion, weather, wardrobe items, preferences, and worn history.",
  },
  {
    id: "wear-rating",
    name: "Wear and rating feedback",
    method: "POST",
    path: "/api/outfits/:id/feedback",
    status: "ready",
    description: "Records wear status, rating, save action, and user preference feedback.",
  },
  {
    id: "plus-status",
    name: "MyFitPick Plus status",
    method: "GET",
    path: "/api/billing/plus-status",
    status: "planned",
    description: "Returns plan status, feature limits, and premium entitlement state.",
  },
];
