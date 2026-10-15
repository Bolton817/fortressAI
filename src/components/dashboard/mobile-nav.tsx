"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Globe, User, CreditCard } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Build", href: "/build", icon: Sparkles },
    { label: "Websites", href: "/dashboard/websites", icon: Globe },
    { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { label: "Profile", href: "/dashboard/profile", icon: User },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 py-1.5 px-4 safe-area-bottom shadow-lg"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors min-w-[64px] ${
                isActive ? "text-emerald-700 font-semibold" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-emerald-700 stroke-[2.5]" : "stroke-[1.75]"}`} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
