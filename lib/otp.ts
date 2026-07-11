import crypto from "crypto";
import { EmailOtp } from "@/models/EmailOtp";

export type OtpPurpose = "signup" | "signin";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function otpTtlMinutes() {
  const value = Number(process.env.OTP_CODE_TTL_MINUTES || 10);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 60) : 10;
}

export function otpMaxAttempts() {
  const value = Number(process.env.OTP_MAX_ATTEMPTS || 5);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 20) : 5;
}

function hashSecret() {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("OTP hash secret must be configured with at least 32 characters.");
  }
  return secret;
}

export function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(input: { email: string; purpose: OtpPurpose; code: string }) {
  return crypto
    .createHmac("sha256", hashSecret())
    .update(`${normalizeEmail(input.email)}:${input.purpose}:${input.code}`)
    .digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function createEmailOtp(input: {
  email: string;
  purpose: OtpPurpose;
  requestedIp?: string;
  userAgent?: string;
}) {
  const email = normalizeEmail(input.email);
  const purpose = input.purpose;
  const code = generateOtpCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + otpTtlMinutes() * 60 * 1000);

  await EmailOtp.updateMany(
    {
      email,
      purpose,
      consumedAt: null,
      expiresAt: { $gt: now }
    },
    { $set: { consumedAt: now } }
  );

  const otp = await EmailOtp.create({
    email,
    purpose,
    codeHash: hashOtpCode({ email, purpose, code }),
    attempts: 0,
    maxAttempts: otpMaxAttempts(),
    expiresAt,
    requestedIp: input.requestedIp || "",
    userAgent: (input.userAgent || "").slice(0, 240)
  });

  return {
    id: String(otp._id),
    email,
    purpose,
    code,
    expiresAt,
    expiresInMinutes: otpTtlMinutes()
  };
}

export async function consumeOtpById(id: string) {
  await EmailOtp.findByIdAndUpdate(id, { $set: { consumedAt: new Date() } });
}

export async function verifyEmailOtp(input: { email: string; purpose: OtpPurpose; code: string }) {
  const email = normalizeEmail(input.email);
  const now = new Date();
  const otp = await EmailOtp.findOne({ email, purpose: input.purpose, consumedAt: null })
    .sort({ createdAt: -1 })
    .exec();

  if (!otp) {
    return { ok: false as const, reason: "missing" as const };
  }

  if (otp.expiresAt <= now) {
    otp.consumedAt = now;
    await otp.save();
    return { ok: false as const, reason: "expired" as const };
  }

  if (otp.attempts >= otp.maxAttempts) {
    otp.consumedAt = now;
    await otp.save();
    return { ok: false as const, reason: "attempts" as const };
  }

  const submittedHash = hashOtpCode({ email, purpose: input.purpose, code: input.code });
  const matches = safeEqualHex(otp.codeHash, submittedHash);

  if (!matches) {
    otp.attempts += 1;
    if (otp.attempts >= otp.maxAttempts) otp.consumedAt = now;
    await otp.save();
    return { ok: false as const, reason: "invalid" as const, attemptsRemaining: Math.max(otp.maxAttempts - otp.attempts, 0) };
  }

  otp.consumedAt = now;
  await otp.save();
  return { ok: true as const, email };
}
