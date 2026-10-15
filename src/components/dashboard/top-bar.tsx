"use client";

import React from "react";
import Link from "next/link";
import { NotificationPopover } from "./notification-popover";

interface TopBarProps {
  user?: {
    displayName: string;
    email: string;
    emailVerified?: boolean;
  } | null;
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Brand / Desktop Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            F
          </div>
          <span className="font-bold text-zinc-900 tracking-tight text-sm">
            FORTRESS
          </span>
        </Link>
        <div className="hidden lg:block text-xs text-zinc-500 font-medium">
          Multi-Tenant Workspace &middot; <span className="text-zinc-700 font-semibold">{user?.displayName || "Workspace"}</span>
        </div>
      </div>

      {/* Right: Notifications & User Status */}
      <div className="flex items-center gap-3">
        {user && !user.emailVerified && (
          <Link
            href="/verify-email"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
          >
            <span>Verify Email</span>
          </Link>
        )}

        {/* Notifications Popover (FR-013) */}
        <NotificationPopover />

        {/* Profile Avatar */}
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/20 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {user?.displayName ? user.displayName.slice(0, 2) : "U"}
          </div>
        </Link>
      </div>
    </header>
  );
}
