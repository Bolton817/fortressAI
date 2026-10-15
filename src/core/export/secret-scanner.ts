import { ExportOutputFile } from "./types";

/**
 * Fortress AI — Static Export Secret Scanner (TDD §21.5, §29.3, FR-082)
 * Audits all files destined for a static package before archiving.
 * Invariant: Never allow database credentials, private API keys, or platform secrets to leak into exports.
 */

export class ExportSecurityViolationError extends Error {
  public readonly code = "EXPORT_SECURITY_VIOLATION";
  public readonly offendingFile: string;
  public readonly ruleTriggered: string;

  constructor(message: string, offendingFile: string, ruleTriggered: string) {
    super(message);
    this.name = "ExportSecurityViolationError";
    this.offendingFile = offendingFile;
    this.ruleTriggered = ruleTriggered;
  }
}

interface SecretRule {
  name: string;
  pattern: RegExp;
  description: string;
}

const SECRET_PATTERNS: SecretRule[] = [
  {
    name: "database-connection-uri",
    pattern: /(postgres(ql)?|mysql|mongodb|redis|prisma):\/\/[^:\s]+:[^@\s]+@[^\s/]+/i,
    description: "Database connection string with embedded password credentials.",
  },
  {
    name: "intasend-secret-key",
    pattern: /ISSecretKey_[a-zA-Z0-9_\-]+/i,
    description: "IntaSend payment gateway secret key.",
  },
  {
    name: "brevo-api-key",
    pattern: /xkeysib-[a-f0-9]{64}/i,
    description: "Brevo transactional email API key.",
  },
  {
    name: "stripe-live-secret-key",
    pattern: /sk_live_[0-9a-zA-Z]{24,}/,
    description: "Stripe live secret key.",
  },
  {
    name: "generic-api-key-env",
    pattern: /(INTASEND_SECRET_KEY|BREVO_API_KEY|SESSION_SECRET|JWT_SECRET|DATABASE_URL)\s*=\s*['"]?[a-zA-Z0-9_\-\.\/]{8,}['"]?/i,
    description: "Environment variable assignment containing secret keys or database URLs.",
  },
  {
    name: "private-cryptographic-key",
    pattern: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/,
    description: "Private cryptographic key block.",
  },
];

/**
 * Scans an array of export files.
 * Throws ExportSecurityViolationError if any sensitive pattern matches.
 */
export function scanFilesForSecrets(files: ExportOutputFile[]): { passed: boolean; scannedCount: number } {
  let scannedCount = 0;

  for (const file of files) {
    scannedCount++;
    const contentStr =
      typeof file.content === "string"
        ? file.content
        : file.content.toString("utf-8");

    for (const rule of SECRET_PATTERNS) {
      if (rule.pattern.test(contentStr)) {
        throw new ExportSecurityViolationError(
          `Security violation: Detected potential secret leak (${rule.name}: ${rule.description}) in exported file "${file.path}". Export creation aborted.`,
          file.path,
          rule.name
        );
      }
    }
  }

  return { passed: true, scannedCount };
}
