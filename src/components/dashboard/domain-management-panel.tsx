"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Info,
  Server,
  ArrowRight,
} from "lucide-react";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  purpose: string;
}

interface DomainItem {
  id: string;
  siteId: string;
  hostname: string;
  domainType: "platform_subdomain" | "custom_apex" | "custom_subdomain";
  verificationStatus: "pending" | "verified" | "failed";
  sslStatus: "pending" | "active" | "error";
  isPrimary: boolean;
  challengeHost?: string;
  challengeValue?: string;
  dnsRecords?: DnsRecord[];
  isLocked: boolean;
  eppAuthCode?: string;
  verifiedAt?: string;
  createdAt: string;
}

interface AvailabilityQuote {
  domain: string;
  isAvailable: boolean;
  tld: string;
  currency: string;
  firstTermPriceCents: number;
  renewalPriceCents: number;
  supported: boolean;
  reason?: string;
  policyNotes?: string;
  requiresAssistedRegistration?: boolean;
}

interface DomainManagementPanelProps {
  siteId: string;
  platformSlug: string;
}

export function DomainManagementPanel({ siteId }: DomainManagementPanelProps) {
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"domains" | "search" | "transfer">("domains");

  // Attach Domain state
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [newHostname, setNewHostname] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyStatusMessage, setVerifyStatusMessage] = useState<string | null>(null);

  // Selected domain for DNS instructions
  const [selectedDomain, setSelectedDomain] = useState<DomainItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Domain search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AvailabilityQuote | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Registration modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registrant, setRegistrant] = useState({
    firstName: "Mara",
    lastName: "Explorer",
    organization: "Mara Horizon Safaris Ltd",
    email: "admin@marahorizon.co.ke",
    phone: "+254712345678",
    addressLine1: "Kenyatta Avenue, CBD",
    city: "Nairobi",
    postalCode: "00100",
    countryCode: "KE",
  });

  // Transfer state
  const [selectedTransferDomain, setSelectedTransferDomain] = useState<DomainItem | null>(null);
  const [eppCode, setEppCode] = useState<string | null>(null);
  const [showEpp, setShowEpp] = useState(false);
  const [togglingLock, setTogglingLock] = useState(false);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/domains`);
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
        if (data.domains && data.domains.length > 0 && !selectedDomain) {
          const firstCustom = data.domains.find((d: DomainItem) => d.domainType !== "platform_subdomain");
          setSelectedDomain(firstCustom || data.domains[0]);
        }
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [siteId, selectedDomain]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchDomains();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchDomains]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAttachDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttaching(true);
    setAttachError(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: newHostname.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAttachError(data.error || "Failed to attach domain.");
        return;
      }

      setNewHostname("");
      setAttachModalOpen(false);
      await fetchDomains();
      setSelectedDomain(data.mapping);
    } catch {
      setAttachError("Network error while attaching domain.");
    } finally {
      setAttaching(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setVerifyingId(domainId);
    setVerifyStatusMessage(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/domains/${domainId}/verify`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setVerifyStatusMessage(`Verification error: ${data.error}`);
        return;
      }

      if (data.success) {
        setVerifyStatusMessage("DNS & TLS successfully verified! Your domain is now active.");
      } else {
        setVerifyStatusMessage(
          data.dnsResult?.reason || "DNS record check pending. Please ensure your TXT record has propagated."
        );
      }

      await fetchDomains();
    } catch {
      setVerifyStatusMessage("Failed to reach verification service.");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDetach = async (domainId: string) => {
    if (!confirm("Are you sure you want to detach this custom domain? Live traffic will stop resolving.")) {
      return;
    }

    try {
      const res = await fetch(`/api/sites/${siteId}/domains/${domainId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchDomains();
        if (selectedDomain?.id === domainId) {
          setSelectedDomain(null);
        }
      }
    } catch {}
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await fetch(`/api/domains/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "Failed to search domain.");
        return;
      }

      setSearchResult(data.result);
    } catch {
      setSearchError("Network error searching domain.");
    } finally {
      setSearching(false);
    }
  };

  const handleRegisterDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchResult) return;

    setRegistering(true);
    setRegisterError(null);
    setRegisterSuccess(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/domains/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: searchResult.domain,
          termYears: 1,
          registrant,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || "Failed to register domain.");
        return;
      }

      setRegisterSuccess(
        `Domain ${searchResult.domain} registered successfully! Invoice receipt: ${data.order?.receiptJson?.invoiceNumber || "Recorded"}`
      );
      setTimeout(() => {
        setRegisterModalOpen(false);
        setRegisterSuccess(null);
        setActiveTab("domains");
      }, 2000);
      await fetchDomains();
    } catch {
      setRegisterError("Network error during domain registration.");
    } finally {
      setRegistering(false);
    }
  };

  const handleToggleLock = async (domainId: string, currentLocked: boolean) => {
    setTogglingLock(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/domains/${domainId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: !currentLocked }),
      });

      if (res.ok) {
        await fetchDomains();
        if (selectedTransferDomain?.id === domainId) {
          setSelectedTransferDomain((prev) => prev ? { ...prev, isLocked: !currentLocked } : null);
        }
      }
    } catch {}
    finally {
      setTogglingLock(false);
    }
  };

  const handleFetchAuthCode = async (domainId: string) => {
    try {
      const res = await fetch(`/api/sites/${siteId}/domains/${domainId}/transfer`);
      if (res.ok) {
        const data = await res.json();
        setEppCode(data.details?.authCode || "N/A");
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("domains")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "domains"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Assigned Domains
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "search"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Search & Register (.com, .co.ke)
        </button>
        <button
          onClick={() => setActiveTab("transfer")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "transfer"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Portability & Transfer (No Lock-In)
        </button>
      </div>

      {/* TAB 1: ASSIGNED DOMAINS */}
      {activeTab === "domains" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Custom Domains & Subdomains</h2>
              <p className="text-xs text-zinc-500">
                Route traffic from platform subdomains and verified custom domains to your live website.
              </p>
            </div>
            <button
              onClick={() => setAttachModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition-colors shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Attach Custom Domain</span>
            </button>
          </div>

          {verifyStatusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{verifyStatusMessage}</span>
            </div>
          )}

          {/* Domains Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading domains...</div>
            ) : domains.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No domains assigned.</div>
            ) : (
              <table className="w-full text-left text-xs text-zinc-600">
                <thead className="bg-zinc-50 text-zinc-400 uppercase font-medium border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3">Hostname</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">DNS Status</th>
                    <th className="px-4 py-3">SSL Certificate</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono">
                  {domains.map((dom) => (
                    <tr
                      key={dom.id}
                      onClick={() => setSelectedDomain(dom)}
                      className={`cursor-pointer transition-colors ${
                        selectedDomain?.id === dom.id ? "bg-emerald-50/60" : "hover:bg-zinc-50/60"
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-zinc-900">
                        <div className="flex items-center gap-2 font-sans">
                          <Globe className="w-4 h-4 text-zinc-400" />
                          <span>{dom.hostname}</span>
                          {dom.domainType === "platform_subdomain" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-normal">
                              Default Subdomain
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans capitalize text-zinc-500">
                        {dom.domainType.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        {dom.verificationStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : dom.verificationStatus === "failed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            DNS Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        {dom.sslStatus === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Secured (HTTPS)
                          </span>
                        ) : dom.sslStatus === "error" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-800">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            SSL Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            Issuing...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          {dom.domainType !== "platform_subdomain" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerify(dom.id);
                                }}
                                disabled={verifyingId === dom.id}
                                className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors"
                              >
                                {verifyingId === dom.id ? "Checking..." : "Verify"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDetach(dom.id);
                                }}
                                className="p-1 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                                title="Detach domain"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <a
                            href={`http://${dom.hostname}:3000`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                            title="Visit website"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* DNS Records Detail Panel for Selected Domain */}
          {selectedDomain && selectedDomain.domainType !== "platform_subdomain" && (
            <div className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span>DNS Configuration Instructions for {selectedDomain.hostname}</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Add the following DNS records at your domain registrar or DNS host (Cloudflare, GoDaddy, Safaricom, etc.).
                  </p>
                </div>
                <button
                  onClick={() => handleVerify(selectedDomain.id)}
                  disabled={verifyingId === selectedDomain.id}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === selectedDomain.id ? "animate-spin" : ""}`} />
                  <span>Verify DNS & SSL</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-zinc-200 rounded-xl overflow-hidden">
                  <thead className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Type</th>
                      <th className="px-3.5 py-2.5">Name / Host</th>
                      <th className="px-3.5 py-2.5">Target / Value</th>
                      <th className="px-3.5 py-2.5">TTL</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-zinc-700">
                    {selectedDomain.dnsRecords?.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="px-3.5 py-2.5 font-bold text-zinc-900">{rec.type}</td>
                        <td className="px-3.5 py-2.5 break-all">{rec.name}</td>
                        <td className="px-3.5 py-2.5 break-all max-w-xs">{rec.value}</td>
                        <td className="px-3.5 py-2.5 font-sans">{rec.ttl}s</td>
                        <td className="px-3.5 py-2.5 text-right font-sans">
                          <button
                            onClick={() => copyToClipboard(rec.value, `rec_${idx}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs transition-colors"
                          >
                            {copiedKey === `rec_${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEARCH & REGISTER */}
      {activeTab === "search" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Search & Register New Domain</h2>
            <p className="text-xs text-zinc-500">
              Instantly register available .com, .co.ke, .ke, or .org domains with transparent renewal prices and zero hidden fees.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. acme-safaris.co.ke or mysite.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-medium text-sm transition-colors shadow-xs"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 max-w-xl">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {searchResult && (
            <div className="p-6 rounded-2xl border border-zinc-200 bg-white max-w-xl space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 font-mono">{searchResult.domain}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {searchResult.isAvailable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Available for Registration
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        Unavailable / Taken
                      </span>
                    )}
                    {searchResult.tld === "co.ke" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                        KeNIC Accredited
                      </span>
                    )}
                  </div>
                </div>

                {searchResult.isAvailable && (
                  <div className="text-right">
                    <div className="text-xl font-bold text-zinc-900">
                      ${(searchResult.firstTermPriceCents / 100).toFixed(2)}
                      <span className="text-xs font-normal text-zinc-500"> / 1st yr</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Renews at ${(searchResult.renewalPriceCents / 100).toFixed(2)}/yr
                    </div>
                  </div>
                )}
              </div>

              {searchResult.policyNotes && (
                <div className="p-3 rounded-xl bg-zinc-50 text-xs text-zinc-600 border border-zinc-100">
                  <span className="font-semibold text-zinc-700">Registry Note:</span> {searchResult.policyNotes}
                </div>
              )}

              {searchResult.isAvailable && (
                <button
                  onClick={() => setRegisterModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Proceed to Register</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PORTABILITY & TRANSFER */}
      {activeTab === "transfer" && (
        <div className="space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Domain Portability & Transfer (No Dark Patterns)</h2>
            <p className="text-xs text-zinc-500">
              You own your domain. You can unlock and transfer it to any registrar (Cloudflare, GoDaddy, Safaricom, etc.) at any time without penalty.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-semibold text-zinc-700">Select Domain to Manage Transfer</label>
            <select
              className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-sm"
              value={selectedTransferDomain?.id || ""}
              onChange={(e) => {
                const dom = domains.find((d) => d.id === e.target.value);
                setSelectedTransferDomain(dom || null);
                setShowEpp(false);
                if (dom) handleFetchAuthCode(dom.id);
              }}
            >
              <option value="">-- Choose a custom domain --</option>
              {domains
                .filter((d) => d.domainType !== "platform_subdomain")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.hostname} ({d.isLocked ? "Locked" : "Unlocked"})
                  </option>
                ))}
            </select>
          </div>

          {selectedTransferDomain && (
            <div className="p-6 rounded-2xl border border-zinc-200 bg-white space-y-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">{selectedTransferDomain.hostname}</h3>
                  <p className="text-xs text-zinc-500">Domain Transfer Lock prevents unauthorized domain theft.</p>
                </div>
                <button
                  onClick={() => handleToggleLock(selectedTransferDomain.id, selectedTransferDomain.isLocked)}
                  disabled={togglingLock}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    selectedTransferDomain.isLocked
                      ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                >
                  {selectedTransferDomain.isLocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked (Click to Unlock)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unlocked for Transfer</span>
                    </>
                  )}
                </button>
              </div>

              {/* EPP Code Card */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-700">EPP Authorization Code</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 font-mono text-sm">
                    {showEpp ? eppCode || "EPP-AuthCodePending!" : "••••••••••••••••••••"}
                  </div>
                  <button
                    onClick={() => setShowEpp(!showEpp)}
                    className="px-3 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-medium text-zinc-700"
                  >
                    {showEpp ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(eppCode || "", "epp_code")}
                    className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1"
                  >
                    {copiedKey === "epp_code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Provide this code to your new registrar when submitting the transfer request.
                </p>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2">
                <h4 className="text-xs font-bold text-zinc-800">Transfer Checklist:</h4>
                <ol className="list-decimal list-inside text-xs text-zinc-600 space-y-1">
                  <li>Unlock your domain using the button above.</li>
                  <li>Copy your EPP code and submit it to your receiving registrar.</li>
                  <li>Confirm the transfer authorization email sent to your registrant address.</li>
                  <li>Your website remains 100% active and published during the transfer process.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ATTACH EXISTING DOMAIN */}
      {attachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">Attach Custom Domain</h3>
            <p className="text-xs text-zinc-500">
              Enter your domain name (apex e.g. <code>safaris.co.ke</code> or subdomain e.g. <code>tours.safaris.com</code>).
            </p>

            <form onSubmit={handleAttachDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Hostname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acmesafaris.co.ke"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {attachError && (
                <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-800 border border-rose-200">
                  {attachError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttachModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attaching || !newHostname.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs"
                >
                  {attaching ? "Attaching..." : "Attach & Generate Challenge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRATION DETAILS & CHECKOUT */}
      {registerModalOpen && searchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-900">Registrant Information: {searchResult.domain}</h3>
            <p className="text-xs text-zinc-500">
              Domains are registered legally in your name. Required contact details will be recorded with the registry.
            </p>

            <form onSubmit={handleRegisterDomain} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">First Name</label>
                  <input
                    type="text"
                    required
                    value={registrant.firstName}
                    onChange={(e) => setRegistrant({ ...registrant, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">Last Name</label>
                  <input
                    type="text"
                    required
                    value={registrant.lastName}
                    onChange={(e) => setRegistrant({ ...registrant, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700">Organization (Optional)</label>
                <input
                  type="text"
                  value={registrant.organization}
                  onChange={(e) => setRegistrant({ ...registrant, organization: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={registrant.email}
                    onChange={(e) => setRegistrant({ ...registrant, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">Phone (+254...)</label>
                  <input
                    type="text"
                    required
                    value={registrant.phone}
                    onChange={(e) => setRegistrant({ ...registrant, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={registrant.addressLine1}
                  onChange={(e) => setRegistrant({ ...registrant, addressLine1: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">City</label>
                  <input
                    type="text"
                    required
                    value={registrant.city}
                    onChange={(e) => setRegistrant({ ...registrant, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={registrant.postalCode}
                    onChange={(e) => setRegistrant({ ...registrant, postalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700">Country Code</label>
                  <input
                    type="text"
                    required
                    value={registrant.countryCode}
                    onChange={(e) => setRegistrant({ ...registrant, countryCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs uppercase"
                  />
                </div>
              </div>

              {registerError && (
                <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-800 border border-rose-200">
                  {registerError}
                </div>
              )}

              {registerSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-xs text-emerald-800 border border-emerald-200">
                  {registerSuccess}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-500">Total Due: </span>
                  <span className="text-sm font-bold text-zinc-900">
                    ${(searchResult.firstTermPriceCents / 100).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegisterModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registering}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-xs font-semibold text-white shadow-xs"
                  >
                    {registering ? "Registering..." : "Confirm & Register"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
