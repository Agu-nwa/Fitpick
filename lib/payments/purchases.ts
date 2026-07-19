import type { Types } from "mongoose";
import { CreditPurchase } from "@/models/CreditPurchase";
import { getCreditPack, formatUsdMinor, type CreditPack } from "@/lib/payments/packs";
import type { CreditPurchaseSummary } from "@/types/payment";

export function serializeCreditPurchase(purchase: any): CreditPurchaseSummary {
  return {
    id: String(purchase._id),
    packId: purchase.packId,
    packName: purchase.packName,
    credits: Number(purchase.credits || 0),
    amountMinor: Number(purchase.amountMinor || 0),
    amountLabel: `$${formatUsdMinor(Number(purchase.amountMinor || 0))}`,
    currency: "USD",
    provider: purchase.provider,
    paymentMethod: purchase.paymentMethod,
    status: purchase.status,
    createdAt: purchase.createdAt ? new Date(purchase.createdAt).toISOString() : null,
    paidAt: purchase.paidAt ? new Date(purchase.paidAt).toISOString() : null,
    creditedAt: purchase.creditedAt ? new Date(purchase.creditedAt).toISOString() : null,
    refundedAt: purchase.refundedAt ? new Date(purchase.refundedAt).toISOString() : null,
    checkoutUrl: purchase.coinpayments?.checkoutUrl || null,
    usdtNetwork: purchase.coinpayments?.networkCode || null,
    expectedUsdtAmount: purchase.coinpayments?.expectedAmount || null,
    receivedUsdtAmount: purchase.coinpayments?.receivedAmount || null,
    confirmations: typeof purchase.coinpayments?.confirmations === "number" ? purchase.coinpayments.confirmations : null,
    requiredConfirmations:
      typeof purchase.coinpayments?.requiredConfirmations === "number" ? purchase.coinpayments.requiredConfirmations : null
  };
}

export function trustedPurchaseFields(input: {
  userId: string | Types.ObjectId;
  pack: CreditPack;
  provider: "stripe" | "coinpayments";
  paymentMethod: "fiat" | "usdt";
}) {
  return {
    userId: input.userId,
    packId: input.pack.id,
    packName: input.pack.name,
    credits: input.pack.credits,
    amountMinor: input.pack.amountMinor,
    currency: input.pack.currency,
    provider: input.provider,
    paymentMethod: input.paymentMethod,
    status: "created" as const
  };
}

export async function createCreditPurchase(input: {
  userId: string | Types.ObjectId;
  packId: string;
  provider: "stripe" | "coinpayments";
  paymentMethod: "fiat" | "usdt";
}) {
  const pack = getCreditPack(input.packId);
  if (!pack) return null;

  const purchase = await CreditPurchase.create(trustedPurchaseFields({
    userId: input.userId,
    pack,
    provider: input.provider,
    paymentMethod: input.paymentMethod
  }));

  return { purchase, pack };
}

export async function listUserPurchases(userId: string | Types.ObjectId, limit = 30) {
  const purchases = await CreditPurchase.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .lean();

  return purchases.map(serializeCreditPurchase);
}
