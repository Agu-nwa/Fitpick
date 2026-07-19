import type { Types } from "mongoose";
import { getOrCreateCreditWallet } from "@/lib/credits/credit-wallet";
import { getCreditPack } from "@/lib/payments/packs";
import { PaymentValidationError } from "@/lib/payments/errors";
import { CreditTransaction } from "@/models/CreditTransaction";
import { CreditPurchase } from "@/models/CreditPurchase";
import { User } from "@/models/User";

const finalSuccessfulStatuses = new Set(["paid", "overpaid", "credited"]);

function ledgerReference(purchaseId: string | Types.ObjectId) {
  return `credit-purchase:${String(purchaseId)}`;
}

function safePurchaseMetadata(input: {
  packId: string;
  provider: "stripe" | "coinpayments";
  providerReference?: string | null;
}) {
  return {
    kind: "credit_purchase",
    packId: input.packId,
    provider: input.provider,
    providerReference: input.providerReference || undefined
  };
}

export async function grantPurchasedCredits(input: {
  purchaseId: string | Types.ObjectId;
  provider: "stripe" | "coinpayments";
  providerReference?: string | null;
}) {
  const purchase = await CreditPurchase.findById(input.purchaseId);
  if (!purchase) throw new PaymentValidationError("purchase_not_found");
  if (purchase.provider !== input.provider) throw new PaymentValidationError("provider_mismatch");
  if (input.providerReference && purchase.providerReference && purchase.providerReference !== input.providerReference) {
    throw new PaymentValidationError("provider_reference_mismatch");
  }
  if (!finalSuccessfulStatuses.has(purchase.status)) {
    throw new PaymentValidationError("purchase_not_paid");
  }

  const pack = getCreditPack(purchase.packId);
  if (!pack || pack.credits !== purchase.credits || pack.amountMinor !== purchase.amountMinor || pack.currency !== purchase.currency) {
    await CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: { status: "review_required", reviewReason: "Trusted credit pack no longer matches purchase record." }
    });
    throw new PaymentValidationError("pack_mismatch");
  }

  const referenceId = ledgerReference(purchase._id);
  const updatedUser = await User.findOneAndUpdate(
    { _id: purchase.userId, creditedPurchaseReferences: { $ne: referenceId } },
    {
      $inc: {
        credits: purchase.credits,
        totalCreditsPurchased: purchase.credits
      },
      $addToSet: { creditedPurchaseReferences: referenceId }
    },
    { new: true }
  );

  const wallet = await getOrCreateCreditWallet(purchase.userId);
  const transaction = await CreditTransaction.findOneAndUpdate(
    { user: purchase.userId, feature: "credit_purchase", referenceId },
    {
      $setOnInsert: {
        user: purchase.userId,
        feature: "credit_purchase",
        credits: purchase.credits,
        metadata: safePurchaseMetadata({
          packId: purchase.packId,
          provider: input.provider,
          providerReference: input.providerReference || purchase.providerReference
        })
      },
      $set: {
        status: "credited",
        balanceAfter: updatedUser ? updatedUser.credits : wallet.balance
      }
    },
    { upsert: true, new: true }
  );

  const creditedPurchase = await CreditPurchase.findByIdAndUpdate(
    purchase._id,
    {
      $set: {
        status: "credited",
        creditedAt: purchase.creditedAt || new Date()
      }
    },
    { new: true }
  );

  return {
    credited: Boolean(updatedUser),
    purchase: creditedPurchase || purchase,
    transaction,
    wallet: await getOrCreateCreditWallet(purchase.userId)
  };
}
