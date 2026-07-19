import { grantPurchasedCredits } from "@/lib/payments/fulfilment";
import { PaymentValidationError } from "@/lib/payments/errors";
import { retrieveCoinPaymentsInvoice, processCoinPaymentsInvoiceEvent } from "@/lib/payments/providers/coinpayments";
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

  if (purchase.provider === "coinpayments") {
    if (!purchase.coinpayments?.invoiceId) throw new PaymentValidationError("missing_invoice_id");
    const invoice = await retrieveCoinPaymentsInvoice(purchase.coinpayments.invoiceId);
    const type = String(invoice?.status || "").toLowerCase() === "completed"
      ? "invoiceCompleted"
      : String(invoice?.status || "invoicePending");
    return processCoinPaymentsInvoiceEvent({
      type,
      invoice: {
        id: invoice?.id || purchase.coinpayments.invoiceId,
        invoiceId: invoice?.invoiceId || purchase.coinpayments.invoiceNumber,
        status: invoice?.status
      }
    });
  }

  return purchase;
}
