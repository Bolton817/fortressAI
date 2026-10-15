/**
 * Fortress AI — Standard Error Hierarchy & Envelope (TDD §39.2)
 * Ensures safe, structured, user-safe error messaging without leaking secrets or stack traces.
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId: string;
    fieldErrors?: FieldError[];
  };
}

export function normalizeFieldErrors(
  errors?: FieldError[] | Record<string, any>
): FieldError[] | undefined {
  if (!errors) return undefined;
  if (Array.isArray(errors)) return errors;
  return Object.entries(errors).flatMap(([field, val]) => {
    if (Array.isArray(val)) {
      return val.map((message) => ({ field, message: String(message) }));
    }
    return [{ field, message: String(val) }];
  });
}

export abstract class FortressError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly retryable: boolean;
  readonly fieldErrors?: FieldError[];

  constructor(message: string, retryable = false, fieldErrors?: FieldError[] | Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.retryable = retryable;
    this.fieldErrors = normalizeFieldErrors(fieldErrors);
  }

  toEnvelope(requestId = `req_${Math.random().toString(36).substring(2, 11)}`): ApiErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        requestId,
        ...(this.fieldErrors && this.fieldErrors.length > 0 ? { fieldErrors: this.fieldErrors } : {}),
      },
    };
  }
}

export class UnauthorizedError extends FortressError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;
  constructor(message = "Authentication required to access this resource.") {
    super(message, false);
  }
}

export class TenantAccessDeniedError extends FortressError {
  readonly code = "TENANT_ACCESS_DENIED";
  readonly statusCode = 403;
  constructor(message = "Access to the requested tenant resource was denied.") {
    super(message, false);
  }
}

export class SchemaValidationError extends FortressError {
  readonly code = "SCHEMA_VALIDATION_ERROR";
  readonly statusCode = 422;
  constructor(message: string, fieldErrors?: FieldError[] | Record<string, any>) {
    super(message, false, fieldErrors);
  }
}

export class RevisionConflictError extends FortressError {
  readonly code = "SITE_REVISION_CONFLICT";
  readonly statusCode = 409;
  constructor(message = "This website changed in another session. Refresh and try again.") {
    super(message, false);
  }
}

export class ResourceNotFoundError extends FortressError {
  readonly code = "RESOURCE_NOT_FOUND";
  readonly statusCode = 404;
  constructor(resource: string, id: string) {
    super(`${resource} with ID "${id}" was not found.`, false);
  }
}

export class ManifestNotFoundError extends FortressError {
  readonly code = "MANIFEST_NOT_FOUND";
  readonly statusCode = 404;
  constructor(sectionId: string, version: string) {
    super(`Section manifest for "${sectionId}@${version}" was not found in the registry.`, false);
  }
}

export class ExportCompilationError extends FortressError {
  readonly code = "EXPORT_COMPILATION_ERROR";
  readonly statusCode = 500;
  constructor(message: string) {
    super(message, true);
  }
}
