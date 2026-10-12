"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Info,
  Lock,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ServerControlWidget } from "@/components/layout/ServerControlWidget";

export default function SettingsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Kolkata");
  const [optOutKeywords, setOptOutKeywords] = useState("STOP,UNSUBSCRIBE,CANCEL");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Connection test state
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Setup instructions modal
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setName(json.profile?.name || "");
        setDefaultLanguage(json.profile?.defaultLanguage || "en");
        setDefaultTimezone(json.profile?.defaultTimezone || "Asia/Kolkata");
        setOptOutKeywords(json.settings?.optOutKeywords || "STOP,UNSUBSCRIBE,CANCEL");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          defaultLanguage,
          defaultTimezone,
          optOutKeywords,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSaveMessage("Settings updated successfully!");
        setTimeout(() => setSaveMessage(null), 3500);
      } else {
        alert(json.error || "Failed to update settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_WHATSAPP_CONNECTION" }),
      });
      const json = await res.json();
      setTestResult(json);
    } catch (err: any) {
      setTestResult({ status: "ERROR", message: err.message });
    } finally {
      setTestingConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading settings and integration diagnostics...</p>
      </div>
    );
  }

  const whatsapp = data?.integrations?.whatsapp;
  const ai = data?.integrations?.ai;

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Settings & Integrations</h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage application server controls (Server ON / Server OFF), system preferences, AI parsing engines, and Meta WhatsApp Cloud API credentials.
        </p>
      </div>

      {saveMessage && <Alert type="success">{saveMessage}</Alert>}

      {/* Application Server Control (Server ON / Server OFF) */}
      <ServerControlWidget variant="card" />

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta WhatsApp Cloud API */}
        <div className="bg-[#0B1120] p-6 sm:p-7 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Official Meta WhatsApp API</h3>
                <span className="text-[11px] text-slate-400 font-medium">Cloud API v20.0 Adapter</span>
              </div>
            </div>
            {whatsapp?.isConfigured ? (
              <Badge variant="emerald" dot>
                CONNECTED
              </Badge>
            ) : (
              <Badge variant="blue" dot>
                SIMULATION MODE
              </Badge>
            )}
          </div>

          <div className="text-xs text-slate-300 space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800 font-medium">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Mode:</span>
              <strong className="font-bold text-white">
                {whatsapp?.isSimulationMode ? "Visibly Labeled Simulation" : "Live Cloud API"}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Phone Number ID:</span>
              <span className="font-mono text-slate-200">
                {whatsapp?.phoneNumberIdMasked || "Not configured (Using mock ID)"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">WABA Account ID:</span>
              <span className="font-mono text-slate-200">
                {whatsapp?.wabaIdMasked || "Not configured"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">System User Token:</span>
              <span className="font-mono text-slate-200">
                {whatsapp?.hasApiToken ? "•••••••••••• (Secured)" : "None"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold flex items-center gap-1 transition-colors"
            >
              <Info className="w-3.5 h-3.5" /> Setup Instructions
            </button>

            <button
              type="button"
              onClick={handleTestWhatsApp}
              disabled={testingConnection}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
            >
              {testingConnection ? "Testing..." : "Test Connection"}
            </button>
          </div>

          {testResult && (
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs text-slate-200 animate-fadeIn space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Status: {testResult.status}
              </span>
              <p className="text-[11px] leading-relaxed text-slate-300">{testResult.message}</p>
              {testResult.instructions && (
                <p className="text-[10px] text-slate-400 font-medium">{testResult.instructions}</p>
              )}
            </div>
          )}
        </div>

        {/* AI Reminder Engine */}
        <div className="bg-[#0B1120] p-6 sm:p-7 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Reminder Engine</h3>
                <span className="text-[11px] text-slate-400 font-medium">Structured prompt extraction</span>
              </div>
            </div>
            {ai?.hasGemini || ai?.hasOpenai ? (
              <Badge variant="emerald" dot>
                LIVE AI
              </Badge>
            ) : (
              <Badge variant="indigo" dot>
                DEMO NLP
              </Badge>
            )}
          </div>

          <div className="text-xs text-slate-300 space-y-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800 font-medium">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Engine:</span>
              <strong className="font-bold text-white">{ai?.activeEngine}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Google Gemini Key:</span>
              <span className="font-mono text-slate-200">
                {ai?.hasGemini ? "Connected (Live)" : "Not provided in .env"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">OpenAI Key:</span>
              <span className="font-mono text-slate-200">
                {ai?.hasOpenai ? "Connected (Live)" : "Not provided in .env"}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            When external API keys are absent, RemindFlow uses its intelligent built-in NLP engine to extract Gujarati/Hindi/English reminder dates, audiences, and variables locally.
          </p>
        </div>
      </div>

      {/* Profile & Preferences Form */}
      <div className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800/80 space-y-5">
        <h3 className="text-base font-bold text-white">Organization Preferences</h3>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1.5">Organization Name / Admin</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-white font-medium transition-all"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1.5">Default Timezone</label>
              <select
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30) [Recommended]</option>
                <option value="UTC">UTC (GMT +0:00)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (BST)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1.5">Default Message Language</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1.5">
                Opt-Out Inbound Keywords (Comma-separated)
              </label>
              <input
                type="text"
                value={optOutKeywords}
                onChange={(e) => setOptOutKeywords(e.target.value)}
                placeholder="STOP,UNSUBSCRIBE,CANCEL"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Data Isolation Notice */}
      <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
        <Lock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <strong className="text-white">Security & Isolation Guarantee:</strong>
          <p className="leading-relaxed">
            All API tokens, phone numbers, and secrets remain server-side. Payloads logged in the database have authorization tokens strictly redacted. No unofficial WhatsApp Web scrapers or browser sessions are used.
          </p>
        </div>
      </div>

      {/* MODAL: META SETUP INSTRUCTIONS */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Official WhatsApp Cloud API Configuration Guide"
        description="Follow these steps to connect your Meta Business WhatsApp Cloud account."
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/25 text-blue-100">
            <strong className="text-white">Important:</strong> RemindFlow AI uses Meta&apos;s Official Cloud API v20.0. No third-party unofficial web automation is permitted.
          </div>

          <ol className="list-decimal list-inside space-y-2">
            <li>
              Go to the{" "}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 font-semibold underline inline-flex items-center gap-0.5"
              >
                Meta for Developers Portal <ExternalLink className="w-3 h-3" />
              </a>{" "}
              and register or log into your developer account.
            </li>
            <li>Create an App of type <strong className="text-white">Business</strong>.</li>
            <li>Add the <strong className="text-white">WhatsApp</strong> product to your App.</li>
            <li>
              Under <strong className="text-white">API Setup</strong>, copy the temporary access token (or generate a permanent System User Token under Business Settings).
            </li>
            <li>
              Copy the <strong className="text-white">Phone Number ID</strong> and <strong className="text-white">WhatsApp Business Account ID</strong>.
            </li>
            <li>
              In your RemindFlow project root, edit the <code className="bg-slate-900 text-blue-300 border border-slate-800 px-1.5 py-0.5 rounded font-mono">.env</code> file:
              <pre className="p-3.5 bg-slate-950 text-blue-300 rounded-xl mt-2 font-mono text-[11px] overflow-x-auto border border-slate-800">
{`WHATSAPP_API_TOKEN="EAAB..."
WHATSAPP_PHONE_NUMBER_ID="1083..."
WHATSAPP_BUSINESS_ACCOUNT_ID="1042..."
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_custom_secret"`}
              </pre>
            </li>
            <li>Restart the app, and RemindFlow will automatically connect to Meta Cloud API!</li>
          </ol>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsHelpOpen(false)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
