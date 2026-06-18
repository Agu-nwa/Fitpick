import crypto from "crypto";
import Stripe from "stripe";

export function verifyPaystackSignature(body: string, signature: string | null) {
  if (!process.env.PAYSTACK_WEBHOOK_SECRET) return false;
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET).update(body).digest("hex");
  return Boolean(signature && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature)));
}

export function constructStripeEvent(body: string, signature: string | null) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return null;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
