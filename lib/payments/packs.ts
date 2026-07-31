export type CreditPackId = "essential" | "popular" | "pro" | "creator";

export type CreditPack = {
  id: CreditPackId;
  name: string;
  label: string;
  credits: number;
  amountMinor: number;
  currency: "USD";
  amountLabel: string;
  appStoreProductId: string;
};

export const creditPacks: Record<CreditPackId, CreditPack> = {
  essential: {
    id: "essential",
    name: "Essential",
    label: "Essential",
    credits: 80,
    amountMinor: 1199,
    currency: "USD",
    amountLabel: "$11.99",
    appStoreProductId: "myfitpick_credits_essential"
  },
  popular: {
    id: "popular",
    name: "Popular",
    label: "Popular",
    credits: 160,
    amountMinor: 2399,
    currency: "USD",
    amountLabel: "$23.99",
    appStoreProductId: "myfitpick_credits_popular"
  },
  pro: {
    id: "pro",
    name: "Pro",
    label: "Pro",
    credits: 320,
    amountMinor: 4799,
    currency: "USD",
    amountLabel: "$47.99",
    appStoreProductId: "myfitpick_credits_pro"
  },
  creator: {
    id: "creator",
    name: "Creator",
    label: "Creator",
    credits: 640,
    amountMinor: 9599,
    currency: "USD",
    amountLabel: "$95.99",
    appStoreProductId: "myfitpick_credits_creator"
  }
};

export function getCreditPack(packId: string) {
  return creditPacks[packId as CreditPackId] || null;
}

export function serializeCreditPacks() {
  return Object.values(creditPacks).map((pack) => ({
    id: pack.id,
    label: pack.label,
    credits: pack.credits,
    amountMinor: pack.amountMinor,
    currency: pack.currency,
    amountLabel: pack.amountLabel,
    appStoreProductId: pack.appStoreProductId,
    status: "available" as const
  }));
}

export function getCreditPackByAppStoreProductId(productId: string) {
  return Object.values(creditPacks).find((pack) => pack.appStoreProductId === productId) || null;
}

export function formatUsdMinor(amountMinor: number) {
  const dollars = Math.floor(amountMinor / 100);
  const cents = String(amountMinor % 100).padStart(2, "0");
  return `${dollars}.${cents}`;
}
