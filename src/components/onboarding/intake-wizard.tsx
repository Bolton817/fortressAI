"use client";

import React, { useState } from "react";
import { FollowUpQuestion } from "@/ai/intake/follow-up-engine";

interface IntakeWizardProps {
  onStartGeneration: (siteId: string, briefData: any) => Promise<void>;
  isGenerating: boolean;
}

export function IntakeWizard({ onStartGeneration, isGenerating }: IntakeWizardProps) {
  const [siteId] = useState(() => "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
  const [businessName, setBusinessName] = useState("Mara Horizon Expeditions");
  const [industry, setIndustry] = useState("Tourism & Safari");
  const [summary, setSummary] = useState(
    "Conservation-led luxury wildlife safaris, photographic tours, and eco-lodges across Masai Mara and Kenya's Great Rift Valley."
  );
  const [city, setCity] = useState("Nairobi");
  const [country, setCountry] = useState("Kenya");
  const [servicesText, setServicesText] = useState(
    "Great Migration Safaris\nPhotographic Bush Tours\nLuxury Tented Camps\nCultural Community Walks"
  );
  const [email, setEmail] = useState("safari@marahorizon.co.ke");
  const [phone, setPhone] = useState("+254 711 000 111");
  const [whatsapp, setWhatsapp] = useState("+254 711 000 111");
  const [tone, setTone] = useState("warm-editorial");
  const [conversionGoal, setConversionGoal] = useState("enquiry");

  const [followUps, setFollowUps] = useState<FollowUpQuestion[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Industry quick presets
  const loadPreset = (preset: string) => {
    if (preset === "tourism") {
      setBusinessName("Mara Horizon Expeditions");
      setIndustry("Tourism & Safari");
      setSummary("Conservation-led luxury wildlife safaris and eco-tours in Kenya.");
      setCity("Nairobi");
      setCountry("Kenya");
      setServicesText("Great Migration Safaris\nPhotographic Tours\nLuxury Tented Camps");
      setEmail("safari@marahorizon.co.ke");
      setPhone("+254 711 000 111");
      setWhatsapp("+254 711 000 111");
      setTone("warm-editorial");
      setConversionGoal("booking");
    } else if (preset === "advisory") {
      setBusinessName("Nairobi Advisory Partners");
      setIndustry("Corporate Consulting");
      setSummary("Strategic financial, M&A, and market expansion advisory across East Africa.");
      setCity("Nairobi");
      setCountry("Kenya");
      setServicesText("Financial Due Diligence\nMarket Entry Strategy\nCorporate Restructuring");
      setEmail("info@nairobiadvisory.co.ke");
      setPhone("+254 20 800 9000");
      setWhatsapp("");
      setTone("modern-authoritative");
      setConversionGoal("quote");
    } else if (preset === "craft") {
      setBusinessName("Apex Artisans & Builders");
      setIndustry("Trades & Construction");
      setSummary("Architectural timber construction, bespoke cabinetry, and fine metalwork.");
      setCity("Mombasa");
      setCountry("Kenya");
      setServicesText("Architectural Cabinetry\nTimber Framing\nCustom Metal Fabrication");
      setEmail("contact@apexartisans.co.ke");
      setPhone("+254 722 555 666");
      setWhatsapp("+254 722 555 666");
      setTone("craft-artisan");
      setConversionGoal("quote");
    } else if (preset === "creative") {
      setBusinessName("Savanna Creative Agency");
      setIndustry("Brand & Digital Media");
      setSummary("Full-service branding, digital product design, and creative storytelling.");
      setCity("Nairobi");
      setCountry("Kenya");
      setServicesText("Brand Identity & Systems\nWeb & Mobile Product UI\nMotion & Video Production");
      setEmail("hello@savannacreative.io");
      setPhone("+254 799 123 456");
      setWhatsapp("+254 799 123 456");
      setTone("vibrant-energetic");
      setConversionGoal("enquiry");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const services = servicesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const rawBrief = {
      businessName,
      industry,
      summary,
      city,
      country,
      services,
      email,
      phone,
      whatsapp,
      tone,
      conversionGoal,
    };

    try {
      // Step 1: Pre-check with intake API
      const intakeRes = await fetch("/api/sites/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, brief: rawBrief }),
      });

      const intakeData = await intakeRes.json();
      if (!intakeRes.ok) {
        throw new Error(intakeData.error?.message || "Brief validation failed");
      }

      // Check if critical follow-ups exist
      if (
        intakeData.completeness?.questions?.length > 0 &&
        !intakeData.completeness.canProceedWithDefaults &&
        followUps.length === 0
      ) {
        setFollowUps(intakeData.completeness.questions);
        return;
      }

      // Step 2: Trigger generation
      await onStartGeneration(siteId, rawBrief);
    } catch (err: any) {
      setValidationError(err.message || "Failed to submit brief.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Conversational Business Intake</h2>
          <p className="text-sm text-slate-500 mt-1">
            Stage A: Provide business facts to initialize the durable AI generation pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-400 self-center uppercase tracking-wider">
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => loadPreset("tourism")}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
          >
            Safari Tour
          </button>
          <button
            type="button"
            onClick={() => loadPreset("advisory")}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            Consulting
          </button>
          <button
            type="button"
            onClick={() => loadPreset("craft")}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
          >
            Artisan Build
          </button>
          <button
            type="button"
            onClick={() => loadPreset("creative")}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
          >
            Creative Agency
          </button>
        </div>
      </div>

      {validationError && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <strong>Validation Alert:</strong> {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Business / Brand Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Industry & Sector *
            </label>
            <input
              type="text"
              required
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Business Summary & Mission *
          </label>
          <textarea
            rows={3}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              City / Base Location
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Core Offerings / Services (1 per line) *
          </label>
          <textarea
            rows={4}
            required
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono text-xs"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Telephone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              WhatsApp Business (Optional)
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Brand Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
            >
              <option value="warm-editorial">Warm Editorial (Story-driven, refined)</option>
              <option value="modern-authoritative">Modern Authoritative (Crisp corporate)</option>
              <option value="craft-artisan">Craft & Artisan (Authentic, tactile)</option>
              <option value="vibrant-energetic">Vibrant & Energetic (High-impact creative)</option>
              <option value="minimal-refined">Minimal & Refined (Clean, objective)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Primary Conversion Goal
            </label>
            <select
              value={conversionGoal}
              onChange={(e) => setConversionGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
            >
              <option value="enquiry">General Enquiry Form</option>
              <option value="quote">Request Formal Quote</option>
              <option value="booking">Direct Booking / Reservation</option>
              <option value="call">Phone Call / WhatsApp Direct</option>
              <option value="portfolio">View Portfolio & Case Studies</option>
            </select>
          </div>
        </div>

        {/* Dynamic Follow-up Section if triggered */}
        {followUps.length > 0 && (
          <div className="p-5 rounded-lg bg-indigo-50 border border-indigo-100 space-y-4">
            <h4 className="text-sm font-bold text-indigo-900">
              Clarifications Needed (TDD §11.1 Stage A):
            </h4>
            {followUps.map((q) => (
              <div key={q.id}>
                <label className="block text-xs font-semibold text-indigo-800 mb-1">
                  {q.question}
                </label>
                <input
                  type="text"
                  placeholder={q.defaultAnswer || "Enter response..."}
                  value={followUpAnswers[q.fieldKey] || ""}
                  onChange={(e) =>
                    setFollowUpAnswers({ ...followUpAnswers, [q.fieldKey]: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md border border-indigo-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isGenerating}
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
          >
            {isGenerating ? "Executing AI Pipeline..." : "Generate Canonical Website"}
          </button>
        </div>
      </form>
    </div>
  );
}
