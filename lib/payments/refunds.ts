import Stripe from "stripe";
import type { Types } from "mongoose";
import { getOrCreateCreditWallet } from "@/lib/credits/credit-wallet";
import { PaymentConfigurationError, PaymentValidationError } from "@/lib/payments/errors";
import { CreditTransaction } from "@/models/CreditTransaction";
import { CreditPurchase } from "@/models/CreditPurchase";
import { User } from "@/models/User";

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new PaymentConfigurationError(["STRIPE_SECRET_KEY"]);
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function refundCreditCount(input: { purchaseCredits: number; amountMinor: number; purchaseAmountMinor: number }) {
  if (input.amountMinor >= input.purchaseAmountMinor) return input.purchaseCredits;
  return Math.max(1, Math.floor((input.purchaseCredits * input.amountMinor) / input.purchaseAmountMinor));
}

async function markReviewRequired(purchaseId: Types.ObjectId | string, reason: string) {
  return CreditPurchase.findByIdAndUpdate(
    purchaseId,
    { $set: { status: "review_required", reviewReason: reason } },
    { new: true }
  );
}

export async function reversePurchasedCreditsForRefund(input: {
  purchaseId: string | Types.ObjectId;
  amountMinor: number;
  providerRefundId?: string | null;
  reason?: string | null;
}) {
  const purchase = await CreditPurchase.findById(input.purchaseId);
  if (!purchase) throw new PaymentValidationError("purchase_not_found");
  if (!purchase.creditedAt) {
    await CreditPurchase.findByIdAndUpdate(purchase._id, {
      $set: {
        status: input.amountMinor >= purchase.amountMinor ? "refunded" : "partially_refunded",
        refundedAt: new Date(),
        refund: {
          providerRefundId: input.providerRefundId || purchase.refund?.providerRefundId,
          amountMinor: input.amountMinor,
          reason: input.reason || purchase.refund?.reason,
          status: "recorded"
        }
      }
    });
    return { reversed: false, reviewRequired: false, wallet: await getOrCreateCreditWallet(purchase.userId) };
  }

  const creditsToReverse = refundCreditCount({
    purchaseCredits: purchase.credits,
    amountMinor: input.amountMinor,
    purchaseAmountMinor: purchase.amountMinor
  });
  const referenceId = `credit-purchase-refund:${String(purchase._id)}:${input.providerRefundId || input.amountMinor}`;
  const wallet = await getOrCreateCreditWallet(purchase.userId);

  if (wallet.purchasedCreditsRemaining < creditsToReverse) {
    await markReviewRequired(purchase._id, "Refund requested after purchased credits were already used.");
    return { reversed: false, reviewRequired: true, wallet };
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: purchase.userId,
      reversedCreditPurchaseReferences: { $ne: referenceId },
      credits: { $gte: creditsToReverse }
    },
    {
      $inc: {
        credits: -creditsToReverse,
        totalCreditsRefunded: creditsToReverse
      },
      $addToSet: { reversedCreditPurchaseReferences: referenceId }
    },
    { new: true }
  );

  const latestWallet = await getOrCreateCreditWallet(purchase.userId);
  await CreditTransaction.findOneAndUpdate(
    { user: purchase.userId, feature: "credit_purchase_refund", referenceId },
    {
      $setOnInsert: {
        user: purchase.userId,
        feature: "credit_purchase_refund",
        credits: -creditsToReverse,
        metadata: {
          kind: "credit_purchase_refund",
          purchaseId: String(purchase._id),
          provider: purchase.provider,
          providerRefundId: input.providerRefundId || undefined
        }
      },
      $set: {
        status: "reversed",
        balanceAfter: updatedUser ? updatedUser.credits : latestWallet.balance
      }
    },
    { upsert: true, new: true }
  );

  const refundStatus = input.amountMinor >= purchase.amountMinor ? "refunded" : "partially_refunded";
  await CreditPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: refundStatus,
      refundedAt: new Date(),
      refund: {
        providerRefundId: input.providerRefundId || purchase.refund?.providerRefundId,
        amountMinor: input.amountMinor,
        reason: input.reason || purchase.refund?.reason,
        status: refundStatus
      }
    }
  });

  return {
    reversed: Boolean(updatedUser),
    reviewRequired: false,
    wallet: await getOrCreateCreditWallet(purchase.userId)
  };
}

export async function refundStripeCreditPurchase(input: {
  purchaseId: string | Types.ObjectId;
  amountMinor?: number;
  reason?: string;
}) {
  const purchase = await CreditPurchase.findById(input.purchaseId);
  if (!purchase) throw new PaymentValidationError("purchase_not_found");
  if (purchase.provider !== "stripe") throw new PaymentValidationError("provider_mismatch");
  if (!purchase.stripe?.paymentIntentId) throw new PaymentValidationError("missing_payment_intent");

  const amountMinor = input.amountMinor || purchase.amountMinor;
  if (amountMinor < 1 || amountMinor > purchase.amountMinor) throw new PaymentValidationError("invalid_refund_amount");

  const refund = await stripeClient().refunds.create(
    {
      payment_intent: purchase.stripe.paymentIntentId,
      amount: amountMinor,
      reason: "requested_by_customer",
      metadata: {
        purchaseId: String(purchase._id),
        packId: purchase.packId
      }
    },
    { idempotencyKey: `credit-refund:${String(purchase._id)}:${amountMinor}` }
  );

  await reversePurchasedCreditsForRefund({
    purchaseId: purchase._id,
    amountMinor,
    providerRefundId: refund.id,
    reason: input.reason || "Admin refund"
  });

  return CreditPurchase.findById(purchase._id);
}
