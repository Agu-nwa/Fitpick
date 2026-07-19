export type CreditPackId = "starter" | "popular" | "pro" | "creator";

export type CreditPack = {
  id: CreditPackId;
  name: string;
  label: string;
  credits: number;
  amountMinor: number;
  currency: "USD";
  amountLabel: string;
};

export const creditPacks: Record<CreditPackId, CreditPack> = {
  starter: {
    id: "starter",
    name: "Starter",
    label: "Starter",
    credits: 50,
    amountMinor: 499,
    currency: "USD",
    amountLabel: "$4.99"
  },
  popular: {
    id: "popular",
    name: "Popular",
    label: "Popular",
    credits: 150,
    amountMinor: 999,
    currency: "USD",
    amountLabel: "$9.99"
  },
  pro: {
    id: "pro",
    name: "Pro",
    label: "Pro",
    credits: 400,
    amountMinor: 1999,
    currency: "USD",
    amountLabel: "$19.99"
  },
  creator: {
    id: "creator",
    name: "Creator",
    label: "Creator",
    credits: 1000,
    amountMinor: 3999,
    currency: "USD",
    amountLabel: "$39.99"
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
    status: "available" as const
  }));
}

export function formatUsdMinor(amountMinor: number) {
  const dollars = Math.floor(amountMinor / 100);
  const cents = String(amountMinor % 100).padStart(2, "0");
  return `${dollars}.${cents}`;
}
