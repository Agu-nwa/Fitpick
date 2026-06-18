import { amountForPlan, type CheckoutInput, type PaymentProviderAdapter } from "@/lib/payments/types";

export function paystackReady() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.FITPICK_PLUS_PAYSTACK_PLAN_CODE);
}

export const paystackPaymentProvider: PaymentProviderAdapter = {
  provider: "paystack",
  readiness: () => ({
    configured: paystackReady(),
    currencies: ["NGN"],
    supportsRecurring: true
  }),
  createCheckout: async (input: CheckoutInput) => {
    if (!paystackReady()) {
      return {
        provider: "paystack",
        ready: false,
        plan: input.plan,
        currency: "NGN",
        authorizationUrl: null,
        accessCode: null,
        reference: null,
        message: "This payment option is not configured yet.",
        nextAction: "configure_paystack"
      };
    }

    const reference = `fitpick_${input.userId}_${Date.now()}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: input.email,
        amount: amountForPlan(input.plan, "NGN") * 100,
        currency: "NGN",
        plan: process.env.FITPICK_PLUS_PAYSTACK_PLAN_CODE,
        reference,
        callback_url: input.successUrl || process.env.PAYSTACK_CALLBACK_URL || `${process.env.APP_URL || "http://localhost:3000"}/plus?checkout=success`,
        metadata: {
          userId: input.userId,
          plan: input.plan
        }
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data?.authorization_url) {
      return {
        provider: "paystack",
        ready: false,
        plan: input.plan,
        currency: "NGN",
        message: "This payment option is not available right now.",
        nextAction: "try_later"
      };
    }

    return {
      provider: "paystack",
      ready: true,
      plan: input.plan,
      currency: "NGN",
      authorizationUrl: payload.data.authorization_url,
      accessCode: payload.data.access_code,
      reference: payload.data.reference || reference,
      message: "Paystack checkout is ready.",
      nextAction: "redirect"
    };
  }
};
