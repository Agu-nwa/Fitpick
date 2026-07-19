type EnvCheck = {
  ok: boolean;
  missing: string[];
  mode: "development" | "test" | "production";
};

const productionRequired = [
  "MONGODB_URI",
  "JWT_SECRET",
  "OPENAI_API_KEY",
  "S3_REGION",
  "NEXT_PUBLIC_APP_URL"
] as const;

export class EnvConfigurationError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super(`Missing required environment variables: ${missing.join(", ")}`);
    this.name = "ENV_CONFIGURATION_ERROR";
    this.missing = missing;
  }
}

export function validateEnv(options: { strict?: boolean } = {}): EnvCheck {
  const mode = (process.env.NODE_ENV || "development") as EnvCheck["mode"];
  const strict = options.strict ?? mode === "production";
  const missing: string[] = productionRequired.filter((key) => !process.env[key]);
  const hasS3Bucket = Boolean(process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET);
  const hasS3AccessKey = Boolean(process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID);
  const hasS3SecretKey = Boolean(process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY);
  const hasCloudFront = Boolean(
    process.env.CLOUDFRONT_PUBLIC_URL ||
    process.env.CLOUDFRONT_URL ||
    process.env.NEXT_PUBLIC_CLOUDFRONT_URL ||
    process.env.S3_PUBLIC_BASE_URL
  );
  const stripePaymentKeys = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;
  const coinpaymentsKeys = [
    "COINPAYMENTS_API_BASE_URL",
    "COINPAYMENTS_CLIENT_ID",
    "COINPAYMENTS_CLIENT_SECRET",
    "COINPAYMENTS_WEBHOOK_SECRET",
    "COINPAYMENTS_USD_CURRENCY_ID",
    "COINPAYMENTS_USDT_NETWORK_ALLOWLIST"
  ] as const;
  const hasPartialStripePayments = stripePaymentKeys.some((key) => Boolean(process.env[key]));
  const hasPartialCoinPayments = coinpaymentsKeys.some((key) => Boolean(process.env[key])) || Boolean(process.env.COINPAYMENTS_WEBHOOK_URL);

  if (!hasS3Bucket && strict) missing.push("S3_BUCKET_OR_S3_BUCKET_NAME");
  if (strict && hasS3AccessKey !== hasS3SecretKey) {
    missing.push("Provide both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or leave both empty to use IAM role credentials.");
  }
  if (!hasCloudFront && strict) missing.push("CLOUDFRONT_URL_OR_NEXT_PUBLIC_CLOUDFRONT_URL");
  if (strict && hasPartialStripePayments) {
    for (const key of stripePaymentKeys) if (!process.env[key]) missing.push(key);
  }
  if (strict && hasPartialCoinPayments) {
    for (const key of coinpaymentsKeys) if (!process.env[key]) missing.push(key);
  }

  return {
    ok: missing.length === 0,
    missing,
    mode
  };
}

export function assertEnvReady(options: { strict?: boolean } = {}) {
  const result = validateEnv(options);
  if (!result.ok && (options.strict ?? result.mode === "production")) {
    throw new EnvConfigurationError(result.missing);
  }
  return result;
}

export function safeEnvStatus() {
  const result = validateEnv({ strict: process.env.NODE_ENV === "production" });
  return {
    ok: result.ok,
    missing: result.missing,
    mode: result.mode
  };
}
