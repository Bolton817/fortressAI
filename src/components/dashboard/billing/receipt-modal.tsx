"use client";

import React from "react";
import { X, Printer, CheckCircle2 } from "lucide-react";

interface InvoiceItem {
  description: string;
  amountMinorUnits: number;
  quantity: number;
  category: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    amountMinorUnits: number;
    currency: string;
    status: string;
    lineItemsJson: InvoiceItem[];
    billingDetailsJson?: { name?: string; email?: string; address?: string };
    paidAt?: string;
    createdAt: string;
  } | null;
}

export function ReceiptModal({ isOpen, onClose, invoice }: ReceiptModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedTotal = (invoice.amountMinorUnits / 100).toFixed(2);
  const dateStr = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date(invoice.createdAt).toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 tracking-tight text-lg">Fortress AI</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Paid
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Invoice Number</p>
              <p className="text-base font-bold text-zinc-900">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date Paid</p>
              <p className="text-sm font-medium text-zinc-700">{dateStr}</p>
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Item</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {invoice.lineItemsJson.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50">
                    <td className="py-3 px-4 font-medium text-zinc-800">{item.description}</td>
                    <td className="py-3 px-4 text-center text-zinc-600">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-900">
                      {invoice.currency} {(item.amountMinorUnits / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
            <span className="text-base font-semibold text-zinc-900">Total Paid</span>
            <span className="text-xl font-extrabold text-emerald-700">
              {invoice.currency} {formattedTotal}
            </span>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-500 space-y-1">
            <p><strong>Merchant:</strong> MegaScript Digital (Fortress AI Platform)</p>
            <p><strong>Tax & Legal:</strong> Kenya / International SaaS Digital Services</p>
            <p>Zero dark patterns: Subscriptions can be canceled or upgraded at any time from your billing tab.</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50 border-t border-zinc-100">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
