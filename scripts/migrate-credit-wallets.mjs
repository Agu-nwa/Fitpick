import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";

for (const filename of [".env.local", ".env.production", ".env"]) {
  const envPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: false, quiet: true });
}

if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI.");
  process.exit(1);
}

const legacySubscriptionFields = [
  "plan",
  "subscriptionStatus",
  "subscriptionId",
  "currentPeriodEnd",
  "trialEndsAt",
  "isPlus",
  "isPremium",
  "entitlement",
  "billingInterval"
];

const walletDefaults = {
  credits: 20,
  totalCreditsPurchased: 0,
  totalCreditsRefunded: 0,
  totalCreditsSpent: 0,
  complimentaryCreditsUsed: 0,
  creditedPurchaseReferences: [],
  reversedCreditPurchaseReferences: []
};

await mongoose.connect(process.env.MONGODB_URI, {
  bufferCommands: false,
  serverSelectionTimeoutMS: 8000
});

const users = mongoose.connection.collection("users");
const defaultPatch = Object.fromEntries(
  Object.entries(walletDefaults).map(([key, value]) => [key, { $ifNull: [`$${key}`, value] }])
);

const initialized = await users.updateMany(
  {},
  [
    {
      $set: defaultPatch
    }
  ]
);

const unsetPatch = Object.fromEntries(legacySubscriptionFields.map((field) => [field, ""]));
const cleaned = await users.updateMany(
  {
    $or: legacySubscriptionFields.map((field) => ({ [field]: { $exists: true } }))
  },
  { $unset: unsetPatch }
);

console.log(JSON.stringify({
  status: "complete",
  initializedUsersMatched: initialized.matchedCount,
  initializedUsersModified: initialized.modifiedCount,
  legacyFieldsMatched: cleaned.matchedCount,
  legacyFieldsModified: cleaned.modifiedCount,
  preservedFields: ["credits", "totalCreditsPurchased", "totalCreditsSpent", "complimentaryCreditsUsed", "stripeCustomerId"]
}, null, 2));

await mongoose.disconnect();
