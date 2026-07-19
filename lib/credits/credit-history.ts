import { CreditTransaction } from "@/models/CreditTransaction";

export function serializeCreditTransaction(transaction: any) {
  return {
    id: String(transaction._id),
    feature: transaction.feature || "unknown",
    credits: Number(transaction.credits || 0),
    status: transaction.status || "spent",
    referenceId: transaction.referenceId || "",
    balanceAfter: typeof transaction.balanceAfter === "number" ? transaction.balanceAfter : null,
    createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : null
  };
}

export async function getCreditHistory(userId: string, limit = 40) {
  const transactions = await CreditTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(limit, 100)))
    .lean();

  return transactions.map(serializeCreditTransaction);
}
