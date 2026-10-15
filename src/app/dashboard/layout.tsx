import React from "react";
import { headers } from "next/headers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/top-bar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { getCurrentUser } from "@/core/auth/auth-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqHeaders = await headers();
  // Build dummy Request to extract session cookie from headers
  const cookie = reqHeaders.get("cookie") || "";
  const dummyReq = new Request("http://localhost", {
    headers: { cookie },
  });
  const user = await getCurrentUser(dummyReq);

  const serializedUser = user
    ? {
        id: user.id,
        displayName: user.displayName,
        email: user.emailNormalised,
        emailVerified: user.emailVerifiedAt !== null,
      }
    : null;

  return (
    <div className="flex min-h-screen bg-zinc-50/60 font-sans text-zinc-900 antialiased">
      {/* Desktop Persistent Sidebar (FR-012) */}
      <Sidebar user={serializedUser} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={serializedUser} />

        <main className="flex-1 p-4 sm:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation (FR-012) */}
        <MobileNav />
      </div>
    </div>
  );
}
