import { randomUUID } from "node:crypto";

/**
 * Fortress AI — Action Confirmation Guard (TDD §13.3, FR-032)
 * Invariant: An AI response alone is never authorization to execute destructive
 * or costly actions. Requires an explicit authenticated confirmation token.
 */

export interface ActionConfirmationRequest {
  token: string;
  action: "DELETE_PAGE" | "REMOVE_SECTION" | "CHANGE_DOMAIN" | "CANCEL_PLAN";
  resourceId: string;
  effectSummary: string;
  expiresAt: string;
}

export class ActionConfirmationGuard {
  private pendingTokens: Map<string, ActionConfirmationRequest> = new Map();

  createConfirmationRequest(params: {
    action: ActionConfirmationRequest["action"];
    resourceId: string;
    effectSummary: string;
    ttlSeconds?: number;
  }): ActionConfirmationRequest {
    const token = randomUUID();
    const ttl = params.ttlSeconds || 300; // 5 minutes default
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const request: ActionConfirmationRequest = {
      token,
      action: params.action,
      resourceId: params.resourceId,
      effectSummary: params.effectSummary,
      expiresAt,
    };

    this.pendingTokens.set(token, request);
    return request;
  }

  verifyAndRedeemToken(token: string): { valid: boolean; request?: ActionConfirmationRequest; error?: string } {
    const request = this.pendingTokens.get(token);
    if (!request) {
      return { valid: false, error: "Invalid or expired confirmation token." };
    }

    if (new Date(request.expiresAt).getTime() < Date.now()) {
      this.pendingTokens.delete(token);
      return { valid: false, error: "Confirmation token has expired. Request action again." };
    }

    // Token redeemed
    this.pendingTokens.delete(token);
    return { valid: true, request };
  }
}

export const globalActionGuard = new ActionConfirmationGuard();
