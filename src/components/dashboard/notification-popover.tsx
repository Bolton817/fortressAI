"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink, AlertTriangle, Sparkles, Shield, Info } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  targetRoute?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok && isMounted) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {}
    };

    const timer = setTimeout(() => {
      load();
    }, 0);
    const interval = setInterval(load, 15000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BUILD_SUCCEEDED":
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case "BUILD_FAILED":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "SECURITY_ALERT":
        return <Shield className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-emerald-600 rounded-full animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-xs sm:bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden text-sm">
            <div className="flex items-center justify-between p-3.5 border-b border-zinc-100 bg-zinc-50/70">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 stroke-1 opacity-50" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !notif.readAt;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => isUnread && markAsRead(notif.id)}
                      className={`p-3.5 transition-colors cursor-pointer flex gap-3 ${
                        isUnread ? "bg-emerald-50/30 hover:bg-emerald-50/60" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{getTypeIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs ${isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"}`}>
                            {notif.title}
                          </p>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                        {notif.targetRoute && (
                          <Link
                            href={notif.targetRoute}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-medium mt-1.5"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
