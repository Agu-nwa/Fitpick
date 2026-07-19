export class PaymentConfigurationError extends Error {
  missing: string[];

  constructor(missing: string[], message = "Payment provider is not configured.") {
    super(message);
    this.name = "PAYMENT_CONFIGURATION_ERROR";
    this.missing = missing;
  }
}

export class PaymentProviderError extends Error {
  code: string;

  constructor(code: string, message = "Payment provider request failed.") {
    super(message);
    this.name = "PAYMENT_PROVIDER_ERROR";
    this.code = code;
  }
}

export class PaymentValidationError extends Error {
  code: string;

  constructor(code: string, message = "Payment validation failed.") {
    super(message);
    this.name = "PAYMENT_VALIDATION_ERROR";
    this.code = code;
  }
}

export function safePaymentErrorCode(error: unknown) {
  if (error instanceof PaymentConfigurationError) return "configuration";
  if (error instanceof PaymentProviderError) return error.code;
  if (error instanceof PaymentValidationError) return error.code;
  return "payment_error";
}
