"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IntakeWizard } from "@/components/onboarding/intake-wizard";
import { GenerationProgress } from "@/components/onboarding/generation-progress";
import { ProgressStatusView } from "@/ai/orchestrator/progress-reporter";

export default function BuildConsolePage() {
  const [activeTab, setActiveTab] = useState<"intake" | "progress" | "chat">("intake");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSiteId, setCurrentSiteId] = useState<string>("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
  const [jobProgress, setJobProgress] = useState<ProgressStatusView | null>(null);

  // Chat editor state
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ sender: "user" | "ai"; text: string; details?: any }>
  >([
    {
      sender: "ai",
      text: "Welcome to Fortress AI Conversational Editor. You can ask me to update headings, switch themes, or swap images. (e.g. 'Change the hero headline to Experience Africa' or 'Switch theme to bold-craft').",
    },
  ]);
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);

  const handleStartGeneration = async (siteId: string, briefData: any) => {
    setIsGenerating(true);
    setCurrentSiteId(siteId);
    setActiveTab("progress");

    try {
      const res = await fetch(`/api/sites/${siteId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformSlug: `site-${siteId.slice(0, 8)}`,
          rawBrief: briefData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Generation failed");
      }

      setJobProgress(data.progress);
    } catch (err: any) {
      if (jobProgress) {
        setJobProgress({
          ...jobProgress,
          hasFailed: true,
          error: err.message,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResume = async () => {
    if (!jobProgress?.jobId) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/sites/${currentSiteId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeJobId: jobProgress.jobId,
        }),
      });
      const data = await res.json();
      setJobProgress(data.progress);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userText }]);
    setIsSubmittingChat(true);

    try {
      const res = await fetch(`/api/sites/${currentSiteId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setChatHistory((prev) => [
          ...prev,
          { sender: "ai", text: `Error: ${data.error?.message || "Action failed."}` },
        ]);
        return;
      }

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.message || "Edit applied successfully.",
          details: data.intent,
        },
      ]);
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: `Network error: ${err.message}` },
      ]);
    } finally {
      setIsSubmittingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-extrabold text-lg tracking-tight text-white hover:text-indigo-400">
              Fortress AI
            </Link>
            <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">
              Stage 2: AI Pipeline & Content Engine
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("intake")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === "intake"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              1. Business Intake
            </button>
            <button
              onClick={() => setActiveTab("progress")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === "progress"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              2. Multi-Stage Pipeline
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === "chat"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              3. Conversational Editor
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === "intake" && (
          <IntakeWizard
            onStartGeneration={handleStartGeneration}
            isGenerating={isGenerating}
          />
        )}

        {activeTab === "progress" && (
          <>
            {jobProgress ? (
              <GenerationProgress progress={jobProgress} onResume={handleResume} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                <p className="text-slate-500 text-sm mb-4">No active generation job.</p>
                <button
                  onClick={() => setActiveTab("intake")}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  Start New Intake
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "chat" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
            {/* Chat header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm">Conversational Editor</h3>
                <p className="text-xs text-slate-400">
                  Targeted section edits with optimistic concurrency & guardrails (TDD §13, FR-031)
                </p>
              </div>
              <Link
                href={`/preview/${currentSiteId}`}
                target="_blank"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded border border-slate-700"
              >
                Preview Site ↗
              </Link>
            </div>

            {/* Messages box */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex ${item.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                      item.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 border border-slate-200 text-slate-900"
                    }`}
                  >
                    <p>{item.text}</p>
                    {item.details && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-xs font-mono text-slate-600">
                        Type: {item.details.type} | Conf: {(item.details.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input bar */}
            <form onSubmit={handleSendChat} className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <input
                type="text"
                placeholder="Ask to edit headlines, change themes, or update content..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <button
                type="submit"
                disabled={isSubmittingChat || !chatMessage.trim()}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50"
              >
                {isSubmittingChat ? "Applying..." : "Send Request"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
