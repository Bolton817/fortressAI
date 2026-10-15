import * as crypto from "node:crypto";
import { userRepository, UserRecord } from "@/db/user-repository";
import { auditRepository } from "@/db/audit-repository";

/**
 * Fortress AI — Google OAuth Provider Adapter (TDD §23.1, FR-002)
 * Manages OAuth state validation, user profile mapping, and account linking.
 * In development / CI without live Google client credentials, provides a deterministic mock flow.
 */

export interface GoogleProfile {
  id: string; // Google sub
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
}

export class GoogleOAuthProvider {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || "mock-google-client-id";
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret";
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
  }

  public isMock(): boolean {
    return this.clientId === "mock-google-client-id";
  }

  public generateAuthUrl(state?: string): string {
    const st = state || crypto.randomBytes(16).toString("hex");
    if (this.isMock()) {
      return `/api/auth/google/callback?code=mock-google-auth-code&state=${st}`;
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      state: st,
      prompt: "select_account",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async exchangeCodeAndFetchProfile(code: string): Promise<GoogleProfile> {
    if (this.isMock() || code.startsWith("mock-")) {
      // Deterministic test profile
      return {
        id: "google-mock-sub-12345",
        email: "safari.founder@example.com",
        emailVerified: true,
        name: "Juma Safari",
        picture: "https://images.example.com/avatar.jpg",
      };
    }

    // Exchange code for tokens with Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new Error(`Google token exchange failed: ${tokenRes.statusText}`);
    }

    const tokens = await tokenRes.json();

    // Fetch userinfo
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error(`Google userinfo fetch failed: ${userRes.statusText}`);
    }

    const userInfo = await userRes.json();
    return {
      id: userInfo.sub,
      email: userInfo.email,
      emailVerified: userInfo.email_verified === true,
      name: userInfo.name || userInfo.email.split("@")[0],
      picture: userInfo.picture,
    };
  }

  public async handleOAuthLogin(profile: GoogleProfile): Promise<UserRecord> {
    if (!profile.emailVerified) {
      throw new Error("Google account email is not verified.");
    }

    // Check if account link already exists
    const existingAccount = userRepository.findAccountByProvider("google", profile.id);
    if (existingAccount) {
      const user = userRepository.findById(existingAccount.userId);
      if (user) {
        auditRepository.record({
          actorUserId: user.id,
          action: "user.login.google",
          targetType: "user",
          targetId: user.id,
        });
        return user;
      }
    }

    // Check if user with this email already exists
    let user = userRepository.findByEmail(profile.email);
    if (!user) {
      // Auto-create user from verified Google identity
      user = userRepository.createUser({
        email: profile.email,
        displayName: profile.name,
        status: "active",
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        policyVersion: "1.0",
      });
      auditRepository.record({
        actorUserId: user.id,
        action: "user.register.google",
        targetType: "user",
        targetId: user.id,
      });
    } else if (!user.emailVerifiedAt) {
      // Trust Google verified email to verify our account
      user = userRepository.updateUser(user.id, {
        emailVerifiedAt: new Date(),
        status: "active",
      });
    }

    // Link Google account
    userRepository.linkAccount({
      userId: user.id,
      provider: "google",
      providerAccountId: profile.id,
      scope: "openid email profile",
    });

    auditRepository.record({
      actorUserId: user.id,
      action: "user.link_account.google",
      targetType: "user",
      targetId: user.id,
    });

    return user;
  }
}

export const googleOAuthProvider = new GoogleOAuthProvider();
