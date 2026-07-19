import type { Types } from "mongoose";
import { INITIAL_COMPLIMENTARY_CREDITS } from "@/lib/credits/credit-costs";
import { User } from "@/models/User";

export type CreditWallet = {
  balance: number;
  totalCreditsPurchased: number;
  totalCreditsRefunded: number;
  totalCreditsSpent: number;
  complimentaryCreditsUsed: number;
  complimentaryCreditsRemaining: number;
  purchasedCreditsRemaining: number;
};

function numberOrDefault(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function serializeCreditWallet(user: any): CreditWallet {
  const balance = Math.max(0, numberOrDefault(user?.credits, INITIAL_COMPLIMENTARY_CREDITS));
  const totalCreditsPurchased = Math.max(0, numberOrDefault(user?.totalCreditsPurchased));
  const totalCreditsRefunded = Math.max(0, numberOrDefault(user?.totalCreditsRefunded));
  const totalCreditsSpent = Math.max(0, numberOrDefault(user?.totalCreditsSpent));
  const complimentaryCreditsUsed = Math.max(0, Math.min(INITIAL_COMPLIMENTARY_CREDITS, numberOrDefault(user?.complimentaryCreditsUsed)));
  const complimentaryCreditsRemaining = Math.max(0, INITIAL_COMPLIMENTARY_CREDITS - complimentaryCreditsUsed);

  return {
    balance,
    totalCreditsPurchased,
    totalCreditsRefunded,
    totalCreditsSpent,
    complimentaryCreditsUsed,
    complimentaryCreditsRemaining,
    purchasedCreditsRemaining: Math.max(0, balance - complimentaryCreditsRemaining)
  };
}

export async function getOrCreateCreditWallet(userId: string | Types.ObjectId) {
  let user = await User.findById(userId);
  if (!user) throw new Error("credit_wallet_user_not_found");

  const patch: Record<string, number> = {};
  if (typeof user.credits !== "number") patch.credits = INITIAL_COMPLIMENTARY_CREDITS;
  if (typeof user.totalCreditsPurchased !== "number") patch.totalCreditsPurchased = 0;
  if (typeof user.totalCreditsRefunded !== "number") patch.totalCreditsRefunded = 0;
  if (typeof user.totalCreditsSpent !== "number") patch.totalCreditsSpent = 0;
  if (typeof user.complimentaryCreditsUsed !== "number") patch.complimentaryCreditsUsed = 0;

  if (Object.keys(patch).length) {
    user = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true }) || user;
  }

  return serializeCreditWallet(user);
}
