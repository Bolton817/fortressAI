"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Calendar,
} from "lucide-react";
import { PlanPickerModal } from "./plan-picker-modal";
import { ReceiptModal } from "./receipt-modal";

interface BillingPanelProps {
  initialSubscription: {
    planId: string;
    status: string;
    billingInterval: string;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  initialPlan: {
    id: string;
    name: string;
    tagline: string;
    featuresList: string[];
    entitlements: {
      maxSites: number;
      maxPagesPerSite: number;
      monthlyAiCredits: number;
      monthlyBlogArticles: number;
      maxCustomDomains: number;
      exportAllowed: boolean;
    };
  };
  initialUsage: {
    totalMonthlyCredits: number;
    usedCredits: number;
    remainingCredits: number;
    percentUsed: number;
    nextResetDate: string;
  };
  initialInvoices: Array<{
    id: string;
    invoiceNumber: string;
    amountMinorUnits: number;
    currency: string;
    status: string;
    lineItemsJson: Array<{
      description: string;
      amountMinorUnits: number;
      quantity: number;
      category: string;
    }>;
    paidAt?: string;
    createdAt: string;
  }>;
}

export function BillingPanel({
  initialSubscription,
  initialPlan,
  initialUsage,
  initialInvoices,
}: BillingPanelProps) {
  const [sub, setSub] = useState(initialSubscription);
  const [plan, setPlan] = useState(initialPlan);
  const [usage, setUsage] = useState(initialUsage);
  const [invoices, setInvoices] = useState(initialInvoices);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel automatic subscription renewal? You will keep full access until the end of your paid billing period.")) {
      return;
    }

    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription");

      setSub((prev) => ({
        ...prev,
        status: "cancel_at_period_end",
        cancelAtPeriodEnd: true,
      }));
      setStatusMessage({
        type: "success",
        text: "Auto-renewal canceled. Your plan remains active until the end of your billing cycle.",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/billing/reactivate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reactivate subscription");

      setSub((prev) => ({
        ...prev,
        status: "active",
        cancelAtPeriodEnd: false,
      }));
      setStatusMessage({
        type: "success",
        text: "Subscription successfully reactivated and scheduled to renew automatically.",
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const renewalDateStr = new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const resetDateStr = new Date(usage.nextResetDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Grid: Current Plan & AI Allowance Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Summary Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Current Subscription
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1 ${
                  sub.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : sub.status === "cancel_at_period_end"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {sub.status === "active" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                {sub.status === "cancel_at_period_end" && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                {sub.status === "cancel_at_period_end" ? "Canceling at period end" : sub.status}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mb-2">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{plan.name} Plan</h2>
              <span className="text-xs text-zinc-500 font-medium capitalize">
                ({sub.billingInterval} billing)
              </span>
            </div>
            <p className="text-sm text-zinc-500 mb-6">{plan.tagline}</p>

            {/* Quota overview pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-zinc-100 text-xs">
              <div>
                <p className="text-zinc-400 font-medium">Websites</p>
                <p className="text-base font-bold text-zinc-800">{plan.entitlements.maxSites}</p>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Pages / Site</p>
                <p className="text-base font-bold text-zinc-800">{plan.entitlements.maxPagesPerSite}</p>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Custom Domains</p>
                <p className="text-base font-bold text-zinc-800">{plan.entitlements.maxCustomDomains}</p>
              </div>
              <div>
                <p className="text-zinc-400 font-medium">Code Export</p>
                <p className="text-base font-bold text-zinc-800">
                  {plan.entitlements.exportAllowed ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>
                {sub.cancelAtPeriodEnd ? "Access expires on:" : "Renews on:"} <strong>{renewalDateStr}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {sub.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReactivateSubscription}
                  className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reactivate Auto-Renew
                </button>
              ) : sub.planId !== "free" ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelSubscription}
                  className="text-xs font-medium text-zinc-500 hover:text-red-600 transition-colors"
                >
                  Cancel Renewal
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setIsPlanModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {sub.planId === "free" ? "Upgrade Plan" : "Change Plan"}
              </button>
            </div>
          </div>
        </div>

        {/* AI Usage Allowance Card */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Monthly AI Allowance
              </span>
              <span className="text-xs font-bold text-zinc-600">{usage.percentUsed}% Used</span>
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-black text-zinc-900">{usage.remainingCredits}</span>
              <span className="text-xs text-zinc-500 font-medium">/ {usage.totalMonthlyCredits} credits left</span>
            </div>
            <p className="text-xs text-zinc-400 mb-6">
              Allowance resets on {resetDateStr} (monthly cycle)
            </p>

            {/* Visual progress bar */}
            <div className="w-full bg-zinc-100 rounded-full h-2.5 mb-6 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  usage.percentUsed > 85 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
              />
            </div>

            <div className="space-y-2 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Full website generation</span>
                <span className="font-semibold text-zinc-800">10 credits</span>
              </div>
              <div className="flex justify-between">
                <span>Blog article generation</span>
                <span className="font-semibold text-zinc-800">2 credits</span>
              </div>
              <div className="flex justify-between">
                <span>Section regeneration</span>
                <span className="font-semibold text-zinc-800">1 credit</span>
              </div>
              <div className="flex justify-between">
                <span>Text / styling edits</span>
                <span className="font-semibold text-emerald-600">Free (0 credits)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsPlanModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              Get More Credits <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Invoices & Billing History Section */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 text-base">Invoices & Receipts</h3>
            <p className="text-xs text-zinc-500">View and print receipts for tax and accounting records</p>
          </div>
          <span className="text-xs text-zinc-400 font-medium">{invoices.length} transaction(s)</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="font-medium text-zinc-700">No invoices generated yet</p>
            <p className="text-xs text-zinc-400 mt-1">
              Receipts will appear here automatically when your subscription or domain orders are processed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/50 border-b border-zinc-200 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Invoice #</th>
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6">Amount</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-xs font-semibold text-zinc-800">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-zinc-600">
                      {new Date(inv.paidAt || inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-zinc-800 font-medium">
                      {inv.lineItemsJson[0]?.description || "Subscription Plan"}
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-zinc-900 text-xs">
                      {inv.currency} {(inv.amountMinorUnits / 100).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Paid
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transparency & Dark-Patterns Guarantee Banner */}
      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-zinc-800">Fortress AI Zero Lock-in & Fair Billing Policy</p>
          <p className="mt-0.5 text-zinc-500 leading-relaxed">
            All prices are billed transparently with no setup fees or hidden contract terms. Cancel anytime with 1-click. You retain full ownership of all generated content, custom domains, and exported code packages indefinitely.
          </p>
        </div>
      </div>

      {/* Plan Picker Modal */}
      <PlanPickerModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        currentPlanId={sub.planId}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
