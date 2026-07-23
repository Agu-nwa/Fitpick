import { CreditTransaction } from "@/models/CreditTransaction";

function roundCredits(value: number) {
  return Math.round(value * 100) / 100;
}

export function serializeCreditTransaction(transaction: any) {
  return {
    id: String(transaction._id),
    feature: transaction.feature || "unknown",
    credits: roundCredits(Number(transaction.credits || 0)),
    status: transaction.status || "spent",
    referenceId: transaction.referenceId || "",
    balanceAfter: typeof transaction.balanceAfter === "number" ? roundCredits(transaction.balanceAfter) : null,
    createdAt: transaction.createdAt ? new Date(transaction.createdAt).toISOString() : null
  };
}

export async function getCreditHistory(userId: string, limit = 40) {
  const transactions = await CreditTransaction.find({
    user: userId,
    status: { $nin: ["reserved", "released"] }
  })
    .sort({ createdAt: -1 })
    .limit(Math.max(1, Math.min(limit, 100)))
    .lean();

  return transactions.map(serializeCreditTransaction);
}
