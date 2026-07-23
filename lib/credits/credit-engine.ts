import crypto from "node:crypto";
import type { Types } from "mongoose";
import { getOrCreateCreditWallet } from "@/lib/credits/credit-wallet";
import { type CreditFeature, getCreditCost, getCreditFeature, INITIAL_COMPLIMENTARY_CREDITS } from "@/lib/credits/credit-costs";
import { CreditTransaction } from "@/models/CreditTransaction";
import { User } from "@/models/User";

export class InsufficientCreditsError extends Error {
  feature: CreditFeature;
  cost: number;
  balance: number;

  constructor(feature: CreditFeature, cost: number, balance: number) {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
    this.feature = feature;
    this.cost = cost;
    this.balance = balance;
  }
}

function stableReference(referenceId?: string | null) {
  const cleaned = String(referenceId || "").trim().slice(0, 160);
  return cleaned || crypto.randomUUID();
}

export function safeCreditMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};
  return JSON.parse(JSON.stringify(metadata, (key, value) => {
    if (/secret|token|key|password|base64|b64|signed/i.test(key)) return undefined;
    if (typeof value === "string" && value.length > 180) return value.slice(0, 180);
    return value;
  }));
}

const reservableStatuses = ["pending", "reserved"];
const releasableStatuses = ["pending", "reserved", "processing"];

export async function validateCreditsForFeature(userId: string | Types.ObjectId, feature: CreditFeature) {
  const wallet = await getOrCreateCreditWallet(userId);
  const cost = getCreditCost(feature);
  return {
    ok: wallet.balance >= cost,
    feature,
    cost,
    balance: wallet.balance,
    wallet
  };
}

export async function ensureCreditsForFeature(userId: string | Types.ObjectId, feature: CreditFeature) {
  const validation = await validateCreditsForFeature(userId, feature);
  if (!validation.ok) throw new InsufficientCreditsError(feature, validation.cost, validation.balance);
  return validation;
}

export function insufficientCreditsPayload(error: InsufficientCreditsError) {
  const feature = getCreditFeature(error.feature);
  return {
    feature: error.feature,
    label: feature.label,
    requiredCredits: error.cost,
    currentCredits: error.balance,
    walletPath: "/wallet"
  };
}

export async function spendCreditsAfterSuccess(input: {
  userId: string | Types.ObjectId;
  feature: CreditFeature;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const feature = input.feature;
  const cost = getCreditCost(feature);
  const referenceId = stableReference(input.referenceId);

  const existing = await CreditTransaction.findOne({
    user: input.userId,
    feature,
    referenceId
  });

  if (existing?.status === "spent") {
    return {
      charged: false,
      transaction: existing,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  const transaction = existing?.status === "failed"
    ? await CreditTransaction.findByIdAndUpdate(
        existing._id,
        { $set: { status: "pending", credits: cost, metadata: safeCreditMetadata(input.metadata) } },
        { new: true }
      ) || existing
    : existing || await CreditTransaction.create({
    user: input.userId,
    feature,
    credits: cost,
    status: "pending",
    referenceId,
    metadata: safeCreditMetadata(input.metadata)
  });

  const claimed = await CreditTransaction.findOneAndUpdate(
    { _id: transaction._id, status: "pending" },
    { $set: { status: "processing" } },
    { new: true }
  );

  if (!claimed) {
    const latest = await CreditTransaction.findById(transaction._id);
    return {
      charged: latest?.status === "spent" ? false : false,
      transaction: latest || transaction,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  const wallet = await getOrCreateCreditWallet(input.userId);
  if (wallet.balance < cost) {
    await CreditTransaction.findByIdAndUpdate(transaction._id, {
      $set: {
        status: "failed",
        balanceAfter: wallet.balance
      }
    });
    throw new InsufficientCreditsError(feature, cost, wallet.balance);
  }

  const complimentaryCreditsToUse = Math.max(
    0,
    Math.min(cost, INITIAL_COMPLIMENTARY_CREDITS - wallet.complimentaryCreditsUsed)
  );

  const updatedUser = await User.findOneAndUpdate(
    { _id: input.userId, credits: { $gte: cost } },
    {
      $inc: {
        credits: -cost,
        totalCreditsSpent: cost,
        complimentaryCreditsUsed: complimentaryCreditsToUse
      }
    },
    { new: true }
  );

  if (!updatedUser) {
    const latestWallet = await getOrCreateCreditWallet(input.userId);
    await CreditTransaction.findByIdAndUpdate(transaction._id, {
      $set: {
        status: "failed",
        balanceAfter: latestWallet.balance
      }
    });
    throw new InsufficientCreditsError(feature, cost, latestWallet.balance);
  }

  const spent = await CreditTransaction.findByIdAndUpdate(
    transaction._id,
    {
      $set: {
        status: "spent",
        balanceAfter: updatedUser.credits
      }
    },
    { new: true }
  );

  return {
    charged: true,
    transaction: spent || transaction,
    wallet: await getOrCreateCreditWallet(input.userId)
  };
}

export async function reserveCreditsForFeature(input: {
  userId: string | Types.ObjectId;
  feature: CreditFeature;
  referenceId: string;
  metadata?: Record<string, unknown>;
}) {
  const feature = input.feature;
  const cost = getCreditCost(feature);
  const referenceId = stableReference(input.referenceId);

  const existing = await CreditTransaction.findOne({
    user: input.userId,
    feature,
    referenceId
  });

  if (existing?.status === "spent") {
    return {
      reserved: false,
      alreadyCommitted: true,
      transaction: existing,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  if (existing && reservableStatuses.includes(existing.status)) {
    return {
      reserved: false,
      alreadyCommitted: false,
      transaction: existing,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  const wallet = await getOrCreateCreditWallet(input.userId);
  if (wallet.balance < cost) throw new InsufficientCreditsError(feature, cost, wallet.balance);

  const transaction = existing
    ? await CreditTransaction.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            status: "reserved",
            credits: cost,
            balanceAfter: wallet.balance,
            metadata: safeCreditMetadata(input.metadata)
          }
        },
        { new: true }
      ) || existing
    : await CreditTransaction.create({
        user: input.userId,
        feature,
        credits: cost,
        status: "reserved",
        referenceId,
        balanceAfter: wallet.balance,
        metadata: safeCreditMetadata(input.metadata)
      });

  return {
    reserved: true,
    alreadyCommitted: false,
    transaction,
    wallet
  };
}

export async function commitReservedCredits(input: {
  userId: string | Types.ObjectId;
  feature: CreditFeature;
  referenceId: string;
  metadata?: Record<string, unknown>;
}) {
  const feature = input.feature;
  const cost = getCreditCost(feature);
  const referenceId = stableReference(input.referenceId);

  const claimed = await CreditTransaction.findOneAndUpdate(
    {
      user: input.userId,
      feature,
      referenceId,
      status: { $in: reservableStatuses }
    },
    {
      $set: {
        status: "processing",
        credits: cost,
        metadata: safeCreditMetadata(input.metadata)
      }
    },
    { new: true }
  );

  if (!claimed) {
    const latest = await CreditTransaction.findOne({ user: input.userId, feature, referenceId });
    if (latest?.status === "spent") {
      return {
        charged: false,
        transaction: latest,
        wallet: await getOrCreateCreditWallet(input.userId)
      };
    }
    if (!latest) {
      await reserveCreditsForFeature(input);
      return commitReservedCredits(input);
    }
    return {
      charged: false,
      transaction: latest,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  const wallet = await getOrCreateCreditWallet(input.userId);
  if (wallet.balance < cost) {
    await CreditTransaction.findByIdAndUpdate(claimed._id, {
      $set: {
        status: "released",
        balanceAfter: wallet.balance,
        metadata: safeCreditMetadata({ ...input.metadata, releaseReason: "insufficient_credits_at_commit" })
      }
    });
    throw new InsufficientCreditsError(feature, cost, wallet.balance);
  }

  const complimentaryCreditsToUse = Math.max(
    0,
    Math.min(cost, INITIAL_COMPLIMENTARY_CREDITS - wallet.complimentaryCreditsUsed)
  );

  const updatedUser = await User.findOneAndUpdate(
    { _id: input.userId, credits: { $gte: cost } },
    {
      $inc: {
        credits: -cost,
        totalCreditsSpent: cost,
        complimentaryCreditsUsed: complimentaryCreditsToUse
      }
    },
    { new: true }
  );

  if (!updatedUser) {
    const latestWallet = await getOrCreateCreditWallet(input.userId);
    await CreditTransaction.findByIdAndUpdate(claimed._id, {
      $set: {
        status: "released",
        balanceAfter: latestWallet.balance,
        metadata: safeCreditMetadata({ ...input.metadata, releaseReason: "wallet_update_failed" })
      }
    });
    throw new InsufficientCreditsError(feature, cost, latestWallet.balance);
  }

  const spent = await CreditTransaction.findByIdAndUpdate(
    claimed._id,
    {
      $set: {
        status: "spent",
        balanceAfter: updatedUser.credits,
        metadata: safeCreditMetadata(input.metadata)
      }
    },
    { new: true }
  );

  return {
    charged: true,
    transaction: spent || claimed,
    wallet: await getOrCreateCreditWallet(input.userId)
  };
}

export async function releaseCreditReservation(input: {
  userId: string | Types.ObjectId;
  feature: CreditFeature;
  referenceId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const referenceId = stableReference(input.referenceId);
  const wallet = await getOrCreateCreditWallet(input.userId);
  const transaction = await CreditTransaction.findOneAndUpdate(
    {
      user: input.userId,
      feature: input.feature,
      referenceId,
      status: { $in: releasableStatuses }
    },
    {
      $set: {
        status: "released",
        balanceAfter: wallet.balance,
        metadata: safeCreditMetadata({ ...input.metadata, releaseReason: input.reason || "generation_failed" })
      }
    },
    { new: true }
  );

  return {
    released: Boolean(transaction),
    transaction,
    wallet
  };
}

export async function refundCommittedCredits(input: {
  userId: string | Types.ObjectId;
  feature: CreditFeature;
  referenceId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const referenceId = stableReference(input.referenceId);
  const spent = await CreditTransaction.findOne({
    user: input.userId,
    feature: input.feature,
    referenceId,
    status: "spent"
  });
  if (!spent) {
    return {
      refunded: false,
      transaction: null,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  const refundReferenceId = `refund:${referenceId}`.slice(0, 160);
  const existingRefund = await CreditTransaction.findOne({
    user: input.userId,
    referenceId: refundReferenceId,
    status: { $in: ["credited", "refunded"] }
  });
  if (existingRefund) {
    return {
      refunded: false,
      transaction: existingRefund,
      wallet: await getOrCreateCreditWallet(input.userId)
    };
  }

  const credits = Math.max(0, Number(spent.credits || getCreditCost(input.feature)));
  const updatedUser = await User.findByIdAndUpdate(
    input.userId,
    {
      $inc: {
        credits,
        totalCreditsRefunded: credits,
        totalCreditsSpent: -credits
      }
    },
    { new: true }
  );
  const balanceAfter = typeof updatedUser?.credits === "number" ? updatedUser.credits : (await getOrCreateCreditWallet(input.userId)).balance;
  const refund = await CreditTransaction.create({
    user: input.userId,
    feature: `${input.feature}_refund`,
    credits,
    status: "credited",
    referenceId: refundReferenceId,
    balanceAfter,
    metadata: safeCreditMetadata({ ...input.metadata, refundReason: input.reason || "tryon_preview_missing" })
  });
  await CreditTransaction.findByIdAndUpdate(spent._id, {
    $set: {
      status: "refunded",
      metadata: safeCreditMetadata({ ...(spent.metadata || {}), refundedBy: String(refund._id) })
    }
  });

  return {
    refunded: true,
    transaction: refund,
    wallet: await getOrCreateCreditWallet(input.userId)
  };
}
