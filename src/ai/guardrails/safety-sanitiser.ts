/**
 * Fortress AI — Security & Prompt Injection Sanitiser (TDD §29.1, FR-030)
 * Protects against prompt injection, malicious XSS payloads, and HTML injection.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+prompts/i,
  /you\s+are\s+now\s+in\s+DAN\s+mode/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /output\s+(all\s+)?environment\s+variables/i,
  /show\s+(your\s+)?api\s+keys/i,
];

export interface SanitisationResult {
  cleanedText: string;
  injectionDetected: boolean;
  detectedPatterns: string[];
}

export function detectAndSanitizeInput(text: string): SanitisationResult {
  const detected: string[] = [];
  let cleaned = text;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      detected.push(pattern.source);
      cleaned = cleaned.replace(pattern, "[FILTERED_INSTRUCTION]");
    }
  }

  // Strip script tags and HTML event handlers
  cleaned = cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:\s*/gi, "")
    .replace(/data:text\/html/gi, "");

  return {
    cleanedText: cleaned.trim(),
    injectionDetected: detected.length > 0,
    detectedPatterns: detected,
  };
}

export function sanitizeObjectStrings<T>(obj: T): T {
  if (typeof obj === "string") {
    return detectAndSanitizeInput(obj).cleanedText as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectStrings(item)) as unknown as T;
  }
  if (obj && typeof obj === "object") {
    const res: any = {};
    for (const [key, val] of Object.entries(obj)) {
      res[key] = sanitizeObjectStrings(val);
    }
    return res as T;
  }
  return obj;
}
