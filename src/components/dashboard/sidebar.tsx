"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Sparkles, Globe, User, LogOut, ShieldCheck } from "lucide-react";

interface SidebarProps {
  user?: {
    displayName: string;
    email: string;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Build", href: "/build", icon: Sparkles },
    { label: "Websites", href: "/dashboard/websites", icon: Globe },
    { label: "Profile", href: "/dashboard/profile", icon: User },
  ];

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-200 bg-white min-h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
            F
          </div>
          <div>
            <span className="font-bold text-zinc-900 tracking-tight text-base block leading-none">
              FORTRESS
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 tracking-widest block uppercase mt-0.5">
              Enterprise AI
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5" aria-label="Dashboard Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? "bg-emerald-50 text-emerald-800 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-zinc-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-4 border-t border-zinc-100">
        <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-50 border border-zinc-100 mb-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {user?.displayName ? user.displayName.slice(0, 2) : "US"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-900 truncate">
              {user?.displayName || "Account User"}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              {user?.email || "user@example.com"}
            </p>
          </div>
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
