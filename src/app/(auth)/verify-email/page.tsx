"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") || "";
  const urlEmail = searchParams.get("email") || "";

  const [token, setToken] = useState(urlToken);
  const [email, setEmail] = useState(urlEmail);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    urlToken && urlEmail ? "verifying" : "idle"
  );
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  const performVerification = async (verifyToken: string, verifyEmail: string) => {
    setStatus("verifying");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken, email: verifyEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Your email address has been successfully verified.");
      } else {
        setStatus("error");
        setMessage(data.error || "Verification failed. Token may have expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error occurred. Please try again.");
    }
  };

  useEffect(() => {
    if (urlToken && urlEmail) {
      const timer = setTimeout(() => {
        performVerification(urlToken, urlEmail);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [urlToken, urlEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(token, email);
  };

  const handleResend = async () => {
    if (!email) {
      setMessage("Please enter your email address to request a new link.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || "A new verification code has been dispatched.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
        <MailCheck className="w-6 h-6" />
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Email Verification</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Verify your email address to enable website publishing and custom domain management.
        </p>
      </div>

      {status === "success" ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-emerald-900">{message}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                status === "error"
                  ? "bg-rose-50 border border-rose-200 text-rose-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-800"
              }`}
            >
              {message}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@business.com"
              required
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Verification Token / Code
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste code from email"
              required
              className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={status === "verifying"}
            className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{status === "verifying" ? "Verifying..." : "Verify Email"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5 font-medium"
            >
              <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
              <span>Resend verification code</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 font-sans text-zinc-900">
      <Suspense fallback={<div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8 text-center text-xs text-zinc-500">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
