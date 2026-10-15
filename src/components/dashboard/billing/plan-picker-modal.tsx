"use client";

import React, { useState } from "react";
import { X, Check, Sparkles, Loader2, CreditCard } from "lucide-react";
import { PLAN_CATALOG, PlanTierId } from "@/core/billing/plan-catalog";

interface PlanPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: string;
  onCheckoutSuccess?: (url: string) => void;
}

export function PlanPickerModal({
  isOpen,
  onClose,
  currentPlanId,
  onCheckoutSuccess,
}: PlanPickerModalProps) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [currency, setCurrency] = useState<"USD" | "KES">("USD");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = async (tierId: PlanTierId) => {
    if (tierId === currentPlanId) return;

    if (tierId === "free") {
      // Free trial does not need checkout
      onClose();
      return;
    }

    setLoadingTier(tierId);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: tierId,
          billingInterval: interval,
          currency,
          provider: currency === "KES" ? "intasend" : "mock",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate checkout");
      }

      if (data.session?.checkoutUrl) {
        if (onCheckoutSuccess) {
          onCheckoutSuccess(data.session.checkoutUrl);
        } else {
          window.location.href = data.session.checkoutUrl;
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to initiate checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const plans = Object.values(PLAN_CATALOG);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-zinc-200 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Choose Your Fortress AI Plan</h2>
            <p className="text-xs text-zinc-500">Transparent pricing with generous AI credits and zero hidden fees</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Currency & Billing Interval */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Currency:</span>
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  currency === "USD"
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/60"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("KES")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  currency === "KES"
                    ? "bg-white text-emerald-800 shadow-sm border border-zinc-200/60"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                KES (M-Pesa)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  interval === "monthly"
                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/60"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("annual")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                  interval === "annual"
                    ? "bg-white text-emerald-700 shadow-sm border border-zinc-200/60"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Annual <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">2 Mos Free</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const pricing = plan.pricing[currency] || plan.pricing.USD;
            const priceVal =
              interval === "annual"
                ? (pricing.annualMinorUnits / 100 / 12).toFixed(0)
                : (pricing.monthlyMinorUnits / 100).toFixed(0);

            const isPro = plan.id === "pro";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                  isPro
                    ? "border-emerald-600 shadow-md ring-2 ring-emerald-600/20 bg-emerald-50/10"
                    : isCurrent
                    ? "border-zinc-400 bg-zinc-50/50"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> {plan.badge}
                  </span>
                )}

                <div>
                  <div className="mb-3">
                    <h3 className="font-bold text-zinc-900 text-base">{plan.name}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{plan.tagline}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-900">
                        {currency === "KES" ? "KES " : "$"}
                        {priceVal}
                      </span>
                      <span className="text-xs text-zinc-500 font-medium">/mo</span>
                    </div>
                    {interval === "annual" && plan.id !== "free" && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Billed annually ({currency} {(pricing.annualMinorUnits / 100).toFixed(0)}/yr)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 text-xs text-zinc-700">
                    {plan.featuresList.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || loadingTier !== null}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isCurrent
                      ? "bg-zinc-100 text-zinc-400 cursor-default"
                      : isPro
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                >
                  {loadingTier === plan.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" /> Upgrade to {plan.name}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
