import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .max(128)
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number.")
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128)
});

export const otpPurposeSchema = z.enum(["signup", "signin"]);

export const requestOtpSchema = z.object({
  email: z.string().trim().email().max(160),
  purpose: otpPurposeSchema
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email().max(160),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
  purpose: otpPurposeSchema,
  name: z.string().trim().min(2).max(80).optional()
});
