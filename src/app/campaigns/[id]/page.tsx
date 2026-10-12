"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  XCircle,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatPhoneDisplay } from "@/lib/phone";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [campaign, setCampaign] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Campaign not found");
      setCampaign(json.campaign);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const handleDispatchNow = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/campaigns/${id}/dispatch-now`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        fetchCampaign();
      } else {
        alert(json.error || "Dispatch failed");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this scheduled campaign?")) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/campaigns/${id}/cancel`, { method: "POST" });
      if (res.ok) fetchCampaign();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading campaign details & recipient snapshots...</p>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <Alert type="error" title="Error Loading Campaign">
          {error || "Campaign not found"}
        </Alert>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns Hub
        </Link>
      </div>
    );
  }

  const recipients = campaign.recipients || [];
  const deliveredCount = recipients.filter((r: any) => ["SENT", "DELIVERED", "READ"].includes(r.status)).length;
  const optedOutSkipped = recipients.filter((r: any) => r.status === "OPTED_OUT_SKIPPED").length;
  const failedCount = recipients.filter((r: any) => r.status === "FAILED").length;

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaigns
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{campaign.name}</h2>
            <StatusBadge status={campaign.status} />
          </div>
          {campaign.objective && <p className="text-xs text-slate-400 font-medium">{campaign.objective}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {campaign.status === "SCHEDULED" && (
            <>
              <button
                onClick={handleDispatchNow}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{actionLoading ? "Processing..." : "Run Now (Immediate)"}</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Campaign Meta Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Audience</span>
          <div className="mt-2 flex items-center gap-2">
            {campaign.targetGroup ? (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-sm"
                style={{ backgroundColor: campaign.targetGroup.color }}
              >
                {campaign.targetGroup.name}
              </span>
            ) : (
              <span className="text-xs text-slate-300 font-semibold">Direct Recipient List</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-2 block">{campaign.totalRecipients} Total Contacts</span>
        </div>

        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Successful Dispatches</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">{deliveredCount}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Processed with snapshots</span>
        </div>

        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Privacy Suppressed</span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-400">{optedOutSkipped}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Opted-out / No consent skipped</span>
        </div>

        <div className="bg-[#0B1120] p-5 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Failed / Errors</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-400">{failedCount}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Carrier or validation faults</span>
        </div>
      </div>

      {/* Message Content Preview Card */}
      <div className="bg-[#0B1120] p-6 sm:p-7 rounded-2xl border border-slate-800/80 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Message Template</h3>
          <span className="text-xs text-slate-400 font-semibold">Language: {campaign.language}</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
          {campaign.messageContent}
        </div>
        {campaign.originalPrompt && (
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Original AI prompt: &ldquo;{campaign.originalPrompt}&rdquo;</span>
          </p>
        )}
      </div>

      {/* Recipient Snapshots Table */}
      <div className="bg-[#0B1120] rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-[#080D1A]">
          <div>
            <h3 className="text-base font-bold text-white">Recipient Snapshots</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified individual delivery status, personalized message snapshots, and carrier logs
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
            {recipients.length} Recipient Record(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Recipient</th>
                <th className="py-3.5 px-5">Personalized Message Snapshot</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Provider Reference</th>
                <th className="py-3.5 px-5">Timestamp / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {recipients.length > 0 ? (
                recipients.map((rec: any) => (
                  <tr key={rec.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* Recipient */}
                    <td className="py-3.5 px-5">
                      <strong className="text-white font-bold block">{rec.nameSnapshot}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatPhoneDisplay(rec.phoneSnapshot)}
                      </span>
                    </td>

                    {/* Personalized Message */}
                    <td className="py-3.5 px-5 max-w-xs">
                      <p className="text-slate-300 truncate font-mono text-[11px]" title={rec.personalizedMessage}>
                        {rec.personalizedMessage}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <StatusBadge status={rec.status} />
                    </td>

                    {/* Provider ID */}
                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-400">
                      {rec.providerMessageId || "—"}
                    </td>

                    {/* Timestamps or Error */}
                    <td className="py-3.5 px-5">
                      {rec.status === "OPTED_OUT_SKIPPED" ? (
                        <span className="text-indigo-300 font-semibold text-[11px] flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{rec.errorMessage || "Contact opted out"}</span>
                        </span>
                      ) : rec.status === "FAILED" ? (
                        <span className="text-rose-400 font-semibold text-[11px]">
                          {rec.errorMessage || "Carrier failure"}
                        </span>
                      ) : rec.sentAt ? (
                        <span className="text-slate-300 font-medium text-[11px]">
                          {new Date(rec.sentAt).toLocaleTimeString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          IST
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Queued</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No recipient snapshots generated yet. Scheduled to dispatch at specified time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
