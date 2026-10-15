import React from "react";
import { headers } from "next/headers";
import { getCurrentUser } from "@/core/auth/auth-guard";
import { subscriptionRepository } from "@/db/subscription-repository";
import { invoiceRepository } from "@/db/invoice-repository";
import { entitlementService } from "@/core/billing/entitlement-service";
import { usageCreditService } from "@/core/billing/usage-credit-service";
import { PlanCatalog } from "@/core/billing/plan-catalog";
import { BillingPanel } from "@/components/dashboard/billing/billing-panel";

export default async function BillingPage() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const dummyReq = new Request("http://localhost", { headers: { cookie } });
  const user = await getCurrentUser(dummyReq);

  const userId = user ? user.id : "demo_user_id";

  const rawSub = subscriptionRepository.getActiveSubscriptionForUser(userId);
  const activePlan = await entitlementService.getActivePlan(userId);
  const usage = await usageCreditService.getUsageBalance(userId);
  const invoices = invoiceRepository.listInvoicesForUser(userId);

  const initialSubscription = rawSub
    ? {
        planId: rawSub.planId,
        status: rawSub.status,
        billingInterval: rawSub.billingInterval,
        currency: rawSub.currency,
        currentPeriodStart: rawSub.currentPeriodStart,
        currentPeriodEnd: rawSub.currentPeriodEnd,
        cancelAtPeriodEnd: rawSub.cancelAtPeriodEnd,
      }
    : {
        planId: "free",
        status: "active",
        billingInterval: "monthly",
        currency: "USD",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Billing & Subscription</h1>
        <p className="text-sm text-zinc-500">
          Manage your plan tier, monthly AI generation allowance, invoices, and payment preferences.
        </p>
      </div>

      <BillingPanel
        initialSubscription={initialSubscription}
        initialPlan={activePlan}
        initialUsage={usage}
        initialInvoices={invoices}
      />
    </div>
  );
}
