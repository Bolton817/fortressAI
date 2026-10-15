/**
 * Fortress AI — PII & Secret Redaction Engine (TDD §32.2, FR-089)
 * Invariant: Operational telemetry, audit trails, and logs MUST NOT leak
 * passwords, authentication secrets, payment card numbers, or raw customer prompts.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /key/i,
  /hash/i,
  /credit[-_]?card/i,
  /cvv/i,
  /pin/i,
  /prompt/i,
];

const NON_SENSITIVE_KEY_PATTERNS = [
  /^tokens$/i,
  /^tokens?_?(?:count|used|total)?$/i,
  /^prompt_?tokens$/i,
  /^completion_?tokens$/i,
  /^total_?tokens$/i,
];

const CARD_NUMBER_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
const BEARER_REGEX = /Bearer\s+([a-zA-Z0-9_\-\.]+)/gi;
const SECRET_KEY_REGEX = /\b(?:sk_live_|sk_test_|xkeysib-|ISSecretKey_)[a-zA-Z0-9_-]+\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/**
 * Sanitizes a raw string by replacing credit card numbers, bearer tokens, and provider keys with [REDACTED]
 */
export function redactString(text: string, options: { maskEmail?: boolean } = {}): string {
  if (!text || typeof text !== "string") return text;

  let sanitized = text;

  // Mask bearer tokens
  sanitized = sanitized.replace(BEARER_REGEX, "Bearer [REDACTED_TOKEN]");

  // Mask secret keys
  sanitized = sanitized.replace(SECRET_KEY_REGEX, "[REDACTED_KEY]");

  // Mask credit card numbers
  sanitized = sanitized.replace(CARD_NUMBER_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return `****-****-****-${digitsOnly.slice(-4)}`;
    }
    return match;
  });

  // Optional email masking
  if (options.maskEmail) {
    sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
      const parts = match.split("@");
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : "***";
      return `${maskedName}@${domain}`;
    });
  }

  return sanitized;
}

/**
 * Deep clones and recursively redacts sensitive fields from objects/arrays
 */
export function redactObject<T>(input: T, options: { maskEmail?: boolean } = {}): T {
  if (input === null || input === undefined) return input;

  if (typeof input === "string") {
    return redactString(input, options) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactObject(item, options)) as unknown as T;
  }

  if (typeof input === "object") {
    // Handle Dates, Buffers, RegExps
    if (input instanceof Date || Buffer.isBuffer(input) || input instanceof RegExp) {
      return input;
    }

    const output: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const isExempt = NON_SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      const isSensitiveKey = !isExempt && SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));

      if (isSensitiveKey) {
        if (value === null || value === undefined) {
          output[key] = value;
        } else if (typeof value === "string") {
          // If key is password, completely redact
          if (/password|hash|pin|cvv/i.test(key)) {
            output[key] = "[REDACTED_SECRET]";
          } else if (/key|secret|token/i.test(key)) {
            output[key] = "[REDACTED_TOKEN]";
          } else if (/prompt/i.test(key)) {
            // Keep length preview for prompts without leaking full text
            output[key] = `[REDACTED_PROMPT (${value.length} chars)]`;
          } else {
            output[key] = "[REDACTED]";
          }
        } else {
          output[key] = "[REDACTED]";
        }
      } else {
        output[key] = redactObject(value, options);
      }
    }
    return output as T;
  }

  return input;
}
