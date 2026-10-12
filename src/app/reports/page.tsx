"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Eye,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatPhoneDisplay } from "@/lib/phone";

export default function ReportsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    optedOutSkipped: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Inspector modal
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        search,
      });
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/reports/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        if (data.metrics) setMetrics(data.metrics);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Delivery Reports & Message Logs</h2>
        <p className="text-sm text-slate-400 mt-1">
          Searchable audit logs of all outbound dispatches, carrier callbacks, and privacy suppression events.
        </p>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sent</span>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">{metrics.sent}</div>
          <span className="text-[10px] text-slate-400 font-medium">Carrier accepted</span>
        </div>

        <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{metrics.delivered}</div>
          <span className="text-[10px] text-slate-400 font-medium">On device</span>
        </div>

        <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Read</span>
          <div className="text-2xl font-extrabold text-indigo-400 mt-1">{metrics.read}</div>
          <span className="text-[10px] text-slate-400 font-medium">Opened by recipient</span>
        </div>

        <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suppressed</span>
          <div className="text-2xl font-extrabold text-violet-400 mt-1">{metrics.optedOutSkipped}</div>
          <span className="text-[10px] text-slate-400 font-medium">Opted-out safely</span>
        </div>

        <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failed</span>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">{metrics.failed}</div>
          <span className="text-[10px] text-slate-400 font-medium">Network / format error</span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white placeholder-slate-500 bg-slate-950 transition-all"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { label: "All Logs", value: "ALL" },
            { label: "Sent", value: "SENT" },
            { label: "Delivered", value: "DELIVERED" },
            { label: "Read", value: "READ" },
            { label: "Suppressed", value: "SUPPRESSED" },
            { label: "Failed", value: "FAILED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Logs Table */}
      <div className="bg-[#0B1120] rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Phone Number</th>
                <th className="py-3.5 px-5">Campaign</th>
                <th className="py-3.5 px-5">Direction</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Logged At</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-white">
                      {formatPhoneDisplay(log.phone)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-300 font-medium">
                      {log.campaign ? (
                        <span className="font-bold text-white">{log.campaign.name}</span>
                      ) : (
                        <span className="text-slate-400">Direct Message</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                        {log.direction}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-medium">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No message logs match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-medium bg-[#080D1A]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: PAYLOAD INSPECTOR */}
      <Modal
        isOpen={Boolean(inspectLog)}
        onClose={() => setInspectLog(null)}
        title="Message Log Inspector"
        description="Detailed carrier response and masked payload."
        maxWidth="lg"
      >
        {inspectLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 font-semibold block">Phone:</span>
                <span className="font-mono font-bold text-white">{inspectLog.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Status:</span>
                <StatusBadge status={inspectLog.status} />
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-300 block mb-1">Payload (Masked Secrets):</span>
              <pre className="p-3.5 bg-slate-950 text-blue-300 border border-slate-800 rounded-xl overflow-x-auto text-[11px] font-mono">
                {inspectLog.payloadMasked
                  ? JSON.stringify(JSON.parse(inspectLog.payloadMasked), null, 2)
                  : "No payload record"}
              </pre>
            </div>

            {inspectLog.providerResponse && (
              <div>
                <span className="font-bold text-slate-300 block mb-1">Provider Raw Response:</span>
                <pre className="p-3.5 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(JSON.parse(inspectLog.providerResponse), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
