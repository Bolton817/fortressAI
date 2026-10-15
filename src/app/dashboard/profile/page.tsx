import React from "react";
import { headers } from "next/headers";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { ProfileForm } from "@/components/dashboard/profile-form";

export default async function ProfilePage() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const dummyReq = new Request("http://localhost", { headers: { cookie } });
  const user = await getCurrentUser(dummyReq);

  const initialUser = user
    ? {
        id: user.id,
        displayName: user.displayName,
        email: user.emailNormalised,
        phoneOptional: user.phoneOptional,
        timezone: user.timezone,
        emailVerified: user.emailVerifiedAt !== null,
      }
    : {
        id: "demo_user_id",
        displayName: "Juma Safari",
        email: "safari.founder@example.com",
        phoneOptional: "+254 700 000 000",
        timezone: "Africa/Nairobi",
        emailVerified: true,
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Personal Profile</h1>
        <p className="text-sm text-zinc-500">
          Manage your account information, notification preferences, security credentials, and data privacy.
        </p>
      </div>

      <ProfileForm initialUser={initialUser} />
    </div>
  );
}
