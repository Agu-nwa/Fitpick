import { grantPurchasedCredits } from "@/lib/payments/fulfilment";
import { PaymentValidationError } from "@/lib/payments/errors";
import { fulfilStripeCheckoutSession, markStripePaymentIntent, stripeClient } from "@/lib/payments/providers/stripe";
import { CreditPurchase } from "@/models/CreditPurchase";

export async function reconcileCreditPurchase(purchaseId: string) {
  const purchase = await CreditPurchase.findById(purchaseId);
  if (!purchase) throw new PaymentValidationError("purchase_not_found");

  if (purchase.provider === "stripe") {
    if (purchase.status === "paid") {
      return grantPurchasedCredits({ purchaseId: purchase._id, provider: "stripe", providerReference: purchase.providerReference });
    }

    if (purchase.stripe?.checkoutSessionId) {
      const session = await stripeClient().checkout.sessions.retrieve(purchase.stripe.checkoutSessionId);
      if (session.payment_status === "paid") return fulfilStripeCheckoutSession(session.id);
      if (session.status === "expired") {
        return CreditPurchase.findByIdAndUpdate(
          purchase._id,
          { $set: { status: "expired", expiredAt: new Date() } },
          { new: true }
        );
      }
      return purchase;
    }

    if (purchase.stripe?.paymentIntentId) {
      const intent = await stripeClient().paymentIntents.retrieve(purchase.stripe.paymentIntentId);
      const updated = await markStripePaymentIntent({ intent, succeeded: intent.status === "succeeded" });
      if (intent.status === "succeeded") {
        return grantPurchasedCredits({ purchaseId: purchase._id, provider: "stripe", providerReference: purchase.providerReference });
      }
      return updated || purchase;
    }

    return purchase;
  }

  return purchase;
}
