"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  UserX,
  History,
} from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { formatPhoneDisplay } from "@/lib/phone";

export default function ConsentPrivacyPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOptOutOpen, setIsAddOptOutOpen] = useState(false);
  const [optOutPhone, setOptOutPhone] = useState("");
  const [optOutReason, setOptOutReason] = useState("Manual opt-out request");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConsentData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/consent");
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsentData();
  }, []);

  const handleAddOptOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_OPT_OUT",
          phone: optOutPhone,
          reason: optOutReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add to suppression list");

      setIsAddOptOutOpen(false);
      setOptOutPhone("");
      fetchConsentData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOptOut = async (phone: string) => {
    if (!confirm(`Remove ${phone} from suppression list and re-enable messaging?`)) return;
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REMOVE_OPT_OUT",
          phone,
        }),
      });
      if (res.ok) fetchConsentData();
    } catch (err) {
      console.error(err);
    }
  };

  const metrics = data?.metrics || { granted: 0, pending: 0, revoked: 0, totalOptOuts: 0 };
  const optOuts = data?.optOuts || [];
  const consentAudit = data?.consentAudit || [];

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Consent & Privacy Center</h2>
          <p className="text-sm text-slate-400 mt-1">
            Maintain strict regulatory compliance, opt-out suppression lists, and an immutable consent audit trail.
          </p>
        </div>

        <button
          onClick={() => {
            setOptOutPhone("");
            setOptOutReason("Manual opt-out request");
            setActionError(null);
            setIsAddOptOutOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(225,29,72,0.45)] transition-all"
        >
          <UserX className="w-4 h-4" />
          <span>+ Add to Suppression List</span>
        </button>
      </div>

      {/* Compliance Guarantee Banner */}
      <div className="p-5 rounded-2xl bg-[#0B1120] border border-slate-800/80 text-xs text-slate-300 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-white text-sm">Automated Privacy Protection Active</h4>
          <p className="text-slate-400 leading-relaxed">
            During campaign dispatch, RemindFlow automatically verifies every contact against this suppression list and verifies active GRANTED consent status. Opted-out recipients are skipped with snapshot reason <span className="font-mono font-bold text-indigo-300">OPTED_OUT_SKIPPED</span> and never charged or sent messages.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0B1120] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Granted Consent</span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">{metrics.granted}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Eligible for campaign notices</span>
        </div>

        <div className="bg-[#0B1120] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Verification</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-400">{metrics.pending}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Awaiting opt-in confirmation</span>
        </div>

        <div className="bg-[#0B1120] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revoked Consent</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-400">{metrics.revoked}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Permission withdrawn</span>
        </div>

        <div className="bg-[#0B1120] p-5 sm:p-6 rounded-2xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suppression List</span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-400">{metrics.totalOptOuts}</div>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">Blocked numbers</span>
        </div>
      </div>

      {/* Suppression List Table */}
      <div className="bg-[#0B1120] rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-[#080D1A]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Active Suppression List (Opt-Outs)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Numbers on this list will never receive automated reminder messages
            </p>
          </div>
          <Badge variant="rose">{optOuts.length} Blocked</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Blocked Phone Number</th>
                <th className="py-3.5 px-5">Opt-Out Reason</th>
                <th className="py-3.5 px-5">Source</th>
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {optOuts.length > 0 ? (
                optOuts.map((o: any) => (
                  <tr key={o.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-white">
                      {formatPhoneDisplay(o.phone)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-300 font-medium">{o.reason || "User requested opt-out"}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                        {o.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-medium">
                      {new Date(o.timestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      IST
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleRemoveOptOut(o.phone)}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                      >
                        Re-enable
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No numbers currently on the suppression list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consent Audit Trail */}
      <div className="bg-[#0B1120] rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-[#080D1A]">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Consent Audit Trail
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical log of all consent changes with verification sources and timestamps
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Contact</th>
                <th className="py-3.5 px-5">Consent Status</th>
                <th className="py-3.5 px-5">Audit Source</th>
                <th className="py-3.5 px-5">Notes / Details</th>
                <th className="py-3.5 px-5">Recorded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {consentAudit.length > 0 ? (
                consentAudit.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <strong className="text-white font-bold block">{a.contact?.name}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatPhoneDisplay(a.contact?.phone)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-mono text-[11px] text-slate-300 font-medium">{a.source}</span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 text-[11px] max-w-xs truncate">
                      {a.notes || "—"}
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-medium">
                      {new Date(a.timestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      IST
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No consent audit events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add to Suppression List */}
      <Modal
        isOpen={isAddOptOutOpen}
        onClose={() => setIsAddOptOutOpen(false)}
        title="Add Phone Number to Suppression List"
        description="Block all outgoing messages to this recipient immediately."
      >
        <form onSubmit={handleAddOptOut} className="space-y-4 text-xs">
          {actionError && <Alert type="error">{actionError}</Alert>}

          <div>
            <label className="font-bold text-slate-300 block mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={optOutPhone}
              onChange={(e) => setOptOutPhone(e.target.value)}
              placeholder="e.g. 9876543208 or +919876543208"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-mono text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Reason for Opt-Out</label>
            <input
              type="text"
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              placeholder="e.g. Requested removal via phone call"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOptOutOpen(false)}
              className="px-4 py-2.5 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(225,29,72,0.45)] disabled:opacity-50 transition-all"
            >
              {actionLoading ? "Blocking..." : "Block & Add to Suppression List"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
