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
    id: "credit-wallet",
    name: "MyFitPick credit wallet",
    method: "GET",
    path: "/api/wallet",
    status: "ready",
    description: "Returns Credit balance, complimentary and purchased Credit split, usage ledger, purchase history, and available packs.",
  },
  {
    id: "stripe-credit-checkout",
    name: "Stripe credit checkout",
    method: "POST",
    path: "/api/payments/stripe/checkout",
    status: "ready",
    description: "Creates a one-time Stripe Checkout Session for a trusted server-side Credit pack.",
  },
  {
    id: "usdt-credit-checkout",
    name: "USDT credit checkout",
    method: "POST",
    path: "/api/payments/usdt/checkout",
    status: "ready",
    description: "Creates a CoinPayments hosted USDT invoice for a trusted server-side Credit pack and selected approved network.",
  },
];
