import Stripe from "stripe";
import { amountForPlan, type CheckoutInput, type PaymentProviderAdapter } from "@/lib/payments/types";

export function stripeReady() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.FITPICK_PLUS_STRIPE_PRICE_ID);
}

function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "");
}

export const stripePaymentProvider: PaymentProviderAdapter = {
  provider: "stripe",
  readiness: () => ({
    configured: stripeReady(),
    currencies: ["USD"],
    supportsRecurring: true
  }),
  createCheckout: async (input: CheckoutInput) => {
    if (!stripeReady()) {
      return {
        provider: "stripe",
        ready: false,
        plan: input.plan,
        currency: input.currency,
        checkoutUrl: null,
        message: "This payment option is not configured yet.",
        nextAction: "configure_stripe"
      };
    }

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.email,
      line_items: [{ price: process.env.FITPICK_PLUS_STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: input.successUrl || process.env.STRIPE_SUCCESS_URL || `${process.env.APP_URL || "http://localhost:3000"}/plus?checkout=success`,
      cancel_url: input.cancelUrl || process.env.STRIPE_CANCEL_URL || `${process.env.APP_URL || "http://localhost:3000"}/plus?checkout=cancelled`,
      metadata: {
        userId: input.userId,
        plan: input.plan,
        amount: String(amountForPlan(input.plan, "USD")),
        currency: "USD"
      },
      subscription_data: {
        metadata: {
          userId: input.userId,
          plan: input.plan
        }
      }
    });

    return {
      provider: "stripe",
      ready: true,
      plan: input.plan,
      currency: "USD",
      checkoutUrl: session.url,
      message: "Stripe checkout is ready.",
      nextAction: "redirect"
    };
  }
};
