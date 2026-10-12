"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  Smartphone,
  Tag,
  Globe,
  Languages,
  RefreshCw,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { renderPersonalizedMessage, validateTemplate } from "@/lib/template";
import { AIReminderExtraction, LANGUAGE_OPTIONS, SupportedLanguage } from "@/lib/types";
import { toTimezoneIso } from "@/lib/date-utils";

interface GroupItem {
  id: string;
  name: string;
  color?: string;
  memberCount?: number;
}

interface SampleContact {
  id: string;
  name: string;
  phone: string;
  roleOrGrade?: string;
  consentStatus: string;
  optOutStatus: boolean;
}

export default function AIReminderBuilderPage() {
  const router = useRouter();

  // Natural language prompt state
  const [prompt, setPrompt] = useState(
    "Create a fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM."
  );
  // Selected language (three options: English, Gujarati, Hindi)
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>("English");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Groups and contacts from DB
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [sampleContacts, setSampleContacts] = useState<SampleContact[]>([]);
  const [selectedSampleContact, setSelectedSampleContact] = useState<SampleContact | null>(null);

  // Extracted/Editable fields
  const [extraction, setExtraction] = useState<AIReminderExtraction | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [messageContent, setMessageContent] = useState("");
  const [variables, setVariables] = useState<string[]>(["name"]);

  // Action status
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Load existing groups and contacts
  useEffect(() => {
    async function loadData() {
      try {
        const [groupsRes, contactsRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/contacts?limit=10"),
        ]);
        const groupsData = await groupsRes.json();
        const contactsData = await contactsRes.json();

        if (groupsData.groups) {
          setGroups(groupsData.groups);
        }
        if (contactsData.contacts && contactsData.contacts.length > 0) {
          setSampleContacts(contactsData.contacts);
          setSelectedSampleContact(contactsData.contacts[0]);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }
    loadData();
  }, []);

  // Parse natural language instruction with explicit language target
  const handleParsePrompt = async (targetLang?: SupportedLanguage) => {
    if (!prompt.trim()) {
      setParseError("Please enter a reminder instruction first.");
      return;
    }

    const langToUse = targetLang || selectedLanguage;
    setParsing(true);
    setParseError(null);
    setSubmitError(null);

    try {
      const res = await fetch("/api/ai/parse-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          timezone,
          targetLanguage: langToUse,
          selectedGroupId: selectedGroupId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to parse prompt");

      const ext: AIReminderExtraction = json.extraction;
      setExtraction(ext);
      setCampaignName(ext.campaignName);
      setSelectedLanguage(
        (ext.language === "Gujarati"
          ? "Gujarati"
          : ext.language === "Hindi"
          ? "Hindi"
          : "English") as SupportedLanguage
      );
      setScheduledDate(ext.scheduledDate);
      setScheduledTime(ext.scheduledTime);
      setTimezone(ext.timezone);
      setMessageContent(ext.message);
      setVariables(ext.variables || ["name"]);

      // Match target group
      if (ext.targetGroupId) {
        setSelectedGroupId(ext.targetGroupId);
      } else if (ext.targetGroup && groups.length > 0) {
        const found = groups.find((g) =>
          g.name.toLowerCase().includes(ext.targetGroup.toLowerCase())
        );
        if (found) setSelectedGroupId(found.id);
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to process instruction with AI.");
    } finally {
      setParsing(false);
    }
  };

  // Handle manual change of target group dropdown
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    const selectedGroup = groups.find((g) => g.id === newGroupId);
    if (!selectedGroup) return;

    // 1. Update campaign name to reflect new group
    setCampaignName((prev) => {
      if (!prev) return `${selectedGroup.name} - Reminder (${selectedLanguage})`;
      if (prev.includes("Unspecified Audience")) {
        return prev.replace("Unspecified Audience", selectedGroup.name);
      }
      for (const g of groups) {
        if (prev.startsWith(g.name + " - ")) {
          return prev.replace(g.name + " - ", `${selectedGroup.name} - `);
        }
      }
      return `${selectedGroup.name} - ${prev}`;
    });

    // 2. Clear missing group warning from extraction and update conflict state
    if (extraction) {
      const updatedMissing = (extraction.missingInformation || []).filter(
        (m) =>
          !m.toLowerCase().includes("no recipient group detected") &&
          !m.toLowerCase().includes("does not exist in your groups yet") &&
          !m.toLowerCase().includes("audience conflict")
      );

      let hasConflict = false;
      let conflictWarning: string | undefined = undefined;

      // If prompt specifically detected a different group that is not "Unspecified Audience"
      const promptDetectedGroup = extraction.targetGroup;
      if (
        promptDetectedGroup &&
        promptDetectedGroup !== "Unspecified Audience" &&
        promptDetectedGroup.toLowerCase() !== selectedGroup.name.toLowerCase()
      ) {
        hasConflict = true;
        conflictWarning = `Audience conflict: Your prompt instruction mentions "${promptDetectedGroup}", but "${selectedGroup.name}" is selected in the Audience Group dropdown. Please confirm your selection.`;
        updatedMissing.push(conflictWarning);
      }

      setExtraction({
        ...extraction,
        targetGroup: selectedGroup.name,
        targetGroupId: selectedGroup.id,
        matchedGroupExact: true,
        hasAudienceConflict: hasConflict,
        audienceConflictWarning: conflictWarning,
        missingInformation: updatedMissing,
      });
    }
  };

  // Switch language and regenerate message
  const handleLanguageChangeAndRegenerate = async (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    await handleParsePrompt(newLang);
  };

  // Insert variable into message content
  const handleInsertVariable = (varName: string) => {
    const token = `{{${varName}}}`;
    setMessageContent((prev) => `${prev} ${token}`);
  };

  // Personalized preview message
  const previewContext = {
    name: selectedSampleContact?.name || "Aarav Patel",
    phone: selectedSampleContact?.phone || "+91 98765 43201",
    fee_amount: "₹4,500",
    due_date: "15 Oct 2026",
    meeting_time: "10:30 AM",
    date: "15 Oct 2026",
    group: groups.find((g) => g.id === selectedGroupId)?.name || "Class 10 CBSE Maths",
  };

  const { rendered: personalizedPreview, missingVariables } = renderPersonalizedMessage(
    messageContent,
    previewContext
  );

  const templateValidation = validateTemplate(messageContent);

  // Submit campaign
  const handleCreateCampaign = async (sendImmediately = false) => {
    if (!campaignName.trim()) {
      setSubmitError("Campaign name is required.");
      return;
    }
    if (!selectedGroupId) {
      setSubmitError("Please select a target recipient group.");
      return;
    }
    if (!messageContent.trim()) {
      setSubmitError("Message content cannot be empty.");
      return;
    }
    if (!templateValidation.isValid) {
      setSubmitError(templateValidation.errors.join(" "));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const scheduledIso = toTimezoneIso(scheduledDate, scheduledTime, timezone);

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          targetGroupId: selectedGroupId,
          messageContent,
          language: selectedLanguage,
          scheduledAt: scheduledIso,
          sendImmediately,
          originalPrompt: prompt,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create campaign.");
      }

      setSubmitSuccess(
        sendImmediately
          ? "Campaign launched immediately! Dispatched with recipient snapshots."
          : `Campaign scheduled successfully for ${scheduledDate} at ${scheduledTime} (${timezone}).`
      );

      setTimeout(() => {
        router.push(`/campaigns/${json.campaign.id}`);
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create campaign.");
    } finally {
      setSubmitting(false);
    }
  };

  // Multilingual quick suggestions
  const suggestions = [
    {
      label: "English Fee Reminder",
      lang: "English" as SupportedLanguage,
      text: "Create a fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM.",
    },
    {
      label: "ગુજરાતી ફી રીમાઇન્ડર (Gujarati)",
      lang: "Gujarati" as SupportedLanguage,
      text: "ક્લાસ 10 CBSE ગણિત ગ્રૂપ માટે આવતીકાલે સવારે 10 વાગ્યે ફી રીમાઇન્ડર બનાવો.",
    },
    {
      label: "हिंदी फीस रिमाइंडर (Hindi)",
      lang: "Hindi" as SupportedLanguage,
      text: "Class 10 CBSE Maths ग्रुप के लिए कल सुबह 10 बजे फीस का रिमाइंडर बनाएं.",
    },
    {
      label: "PTM Meeting Notice",
      lang: "English" as SupportedLanguage,
      text: "Send a Parent-Teacher Meeting (PTM) reminder to Parent Council for Saturday 11 AM.",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Title & Explainer Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="blue" dot>
            Natural Language to Campaign
          </Badge>
          <span className="text-xs text-slate-400 font-medium">• Multilingual AI Extraction Engine</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">AI Reminder Builder</h2>
        <p className="text-sm text-slate-400 mt-1">
          Describe your message in everyday language, choose your preferred language (English, ગુજરાતી, or हिंदी), and RemindFlow generates a fully localized reminder with personalized variables and live preview.
        </p>
      </div>

      {/* Step 1: Natural Language Prompt Box & Language Selector */}
      <div className="bg-[#0B1120] p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Describe your reminder instruction:</span>
          </label>

          {/* PRIMARY LANGUAGE SELECTOR */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <Languages className="w-4 h-4 text-indigo-400 ml-1" />
            <span className="text-xs font-bold text-slate-300">Language:</span>
            <div className="flex items-center gap-1">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedLanguage(opt.value as SupportedLanguage)}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                    selectedLanguage === opt.value
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Create a fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM."
            className="w-full p-4 rounded-xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium text-white placeholder-slate-500 bg-slate-950/90"
          />
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sample Instructions:</span>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(s.text);
                  setSelectedLanguage(s.lang);
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-slate-300 transition-all text-left flex items-center gap-1.5"
              >
                <span className="font-bold text-blue-400">[{s.label}]:</span>
                <span className="truncate max-w-xs">{s.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls Bar: Timezone & Generate Button */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 font-semibold">Timezone:</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="text-xs border border-slate-800 rounded-xl px-2.5 py-1.5 bg-slate-950 font-semibold text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
              <option value="UTC">UTC (GMT +0:00)</option>
              <option value="America/New_York">America/New_York (EST)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">
              Generating in:{" "}
              <strong className="text-blue-400 font-bold">
                {LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label}
              </strong>
            </span>

            <button
              onClick={() => handleParsePrompt()}
              disabled={parsing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{parsing ? "Generating..." : `Generate Reminder in ${selectedLanguage}`}</span>
            </button>
          </div>
        </div>

        {parseError && <Alert type="error">{parseError}</Alert>}
      </div>

      {/* Step 2: Review & Edit Structured Extracted Details */}
      {extraction && (
        <div className="bg-[#0B1120] p-6 sm:p-8 rounded-2xl border border-slate-800/80 space-y-6 animate-fadeIn">
          {/* AI Status & Language Confirmation Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                Engine: {extraction.aiProviderName}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/25">
                Language: {LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label}
              </span>
              {extraction.isDemoMode && (
                <Badge variant="blue">Demo Mode Active</Badge>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">{extraction.explanation}</span>
          </div>

          {/* Missing Information Alerts if any */}
          {extraction.missingInformation && extraction.missingInformation.length > 0 && (
            <Alert type="warning" title="Items Requiring Verification:">
              <ul className="list-disc list-inside space-y-1 text-xs">
                {extraction.missingInformation.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Campaign Name */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white bg-slate-950 transition-all"
              />
            </div>

            {/* Target Group */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Audience Group ({groups.find((g) => g.id === selectedGroupId)?.name || "Select Group"})
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 font-medium text-white bg-slate-950 transition-all ${
                  extraction?.hasAudienceConflict
                    ? "border-amber-500/60 focus:ring-amber-500/20 focus:border-amber-400"
                    : "border-slate-800 focus:ring-blue-500/30 focus:border-blue-500"
                }`}
              >
                <option value="">-- Choose Target Group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount ?? 0} contacts)
                  </option>
                ))}
              </select>
              {extraction?.hasAudienceConflict && (
                <p className="text-[11px] text-amber-300 mt-1 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Prompt and dropdown differ. Selection above will be used.</span>
                </p>
              )}
            </div>

            {/* Language Selector in Edit Section with Instant Regenerate Action */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Message Language</span>
                </label>
                <span className="text-[11px] text-blue-400 font-semibold">
                  Switching language updates the message
                </span>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as SupportedLanguage;
                    handleLanguageChangeAndRegenerate(newLang);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white bg-slate-950 transition-all"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleParsePrompt(selectedLanguage)}
                  disabled={parsing}
                  title="Regenerate message in the selected language"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${parsing ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Date and Time Picker */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white bg-slate-950 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Time (24h)</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white bg-slate-950 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Timezone Confirmation Box */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Full Schedule:</span>
              <strong className="font-bold text-white">
                {scheduledDate} at {scheduledTime} ({timezone})
              </strong>
            </span>
            <span className="text-[11px] text-indigo-300 font-medium">Survives application restart</span>
          </div>

          {/* Step 3: Message Editor & Live Preview */}
          <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Message Template ({LANGUAGE_OPTIONS.find((l) => l.value === selectedLanguage)?.label})
                </h3>
                <p className="text-xs text-slate-400">Insert variables to personalize for each recipient</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {messageContent.length} chars
              </span>
            </div>

            {/* Variable Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Insert Variables:</span>
              </span>
              {["name", "fee_amount", "due_date", "meeting_time", "group", "date", "phone"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsertVariable(v)}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-900 hover:bg-blue-500/15 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-500/30 font-mono font-medium transition-all"
                >
                  +{`{{${v}}}`}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-sans leading-relaxed text-white bg-slate-950 transition-all"
            />

            {/* Template validation errors */}
            {!templateValidation.isValid && (
              <Alert type="error" title="Template Syntax Error:">
                {templateValidation.errors.join(", ")}
              </Alert>
            )}

            {/* Live WhatsApp Simulation Preview */}
            <div className="bg-slate-900/70 rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Live WhatsApp Recipient Preview ({selectedLanguage})
                  </span>
                </div>

                {/* Sample Contact Switcher */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Preview as:</span>
                  <select
                    value={selectedSampleContact?.id || ""}
                    onChange={(e) => {
                      const found = sampleContacts.find((c) => c.id === e.target.value);
                      if (found) setSelectedSampleContact(found);
                    }}
                    className="border border-slate-800 rounded-xl px-2.5 py-1 bg-slate-950 font-semibold text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {sampleContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dark Mode WhatsApp Message Bubble */}
              <div className="max-w-md bg-[#0F2922] text-emerald-50 p-4 rounded-2xl rounded-tl-sm border border-emerald-500/25 font-sans text-sm leading-relaxed shadow-md">
                <p className="whitespace-pre-wrap">{personalizedPreview}</p>
                <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-emerald-300/70">
                  <span>{scheduledTime || "10:00"}</span>
                  <span className="text-blue-400 font-bold">✓✓</span>
                </div>
              </div>

              {missingVariables.length > 0 && (
                <p className="text-xs text-amber-200 flex items-center gap-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/25">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>
                    Unmapped variables in preview: {missingVariables.join(", ")}. These will be replaced dynamically or preserved if missing.
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Submission feedback */}
          {submitError && <Alert type="error">{submitError}</Alert>}
          {submitSuccess && <Alert type="success">{submitSuccess}</Alert>}

          {/* Confirmation & Launch Action Buttons */}
          <div className="border-t border-slate-800/80 pt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Target Audience:{" "}
              <strong className="text-white font-bold">
                {groups.find((g) => g.id === selectedGroupId)?.name || "Select audience"}
              </strong>{" "}
              • Language: <strong className="text-blue-400 font-bold">{selectedLanguage}</strong>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setExtraction(null)}
                className="px-4 py-2.5 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Reset Draft
              </button>

              <button
                type="button"
                onClick={() => handleCreateCampaign(true)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-all disabled:opacity-50"
              >
                Send Immediately (Run Now)
              </button>

              <button
                type="button"
                onClick={() => handleCreateCampaign(false)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                <span>{submitting ? "Scheduling..." : "Schedule Campaign"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
