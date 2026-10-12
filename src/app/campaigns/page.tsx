"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Copy,
  XCircle,
  Play,
  Trash2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";

interface CampaignItem {
  id: string;
  name: string;
  objective: string | null;
  status: string;
  language: string;
  messageContent: string;
  scheduledAt: string | null;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  createdAt: string;
  targetGroup?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        search,
      });
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCampaigns();
  };

  const handleDuplicate = async (id: string) => {
    try {
      setActionLoading(`dup_${id}`);
      const res = await fetch(`/api/campaigns/${id}/duplicate`, { method: "POST" });
      if (res.ok) fetchCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled campaign?")) return;
    try {
      setActionLoading(`cancel_${id}`);
      const res = await fetch(`/api/campaigns/${id}/cancel`, { method: "POST" });
      if (res.ok) fetchCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispatchNow = async (id: string) => {
    try {
      setActionLoading(`dispatch_${id}`);
      const res = await fetch(`/api/campaigns/${id}/dispatch-now`, { method: "POST" });
      if (res.ok) fetchCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This will remove all associated logs.")) return;
    try {
      setActionLoading(`del_${id}`);
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) fetchCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Campaigns Hub</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage scheduled, draft, and completed reminder campaigns across all recipient batches.
          </p>
        </div>
        <Link
          href="/ai-builder"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all w-fit"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Create AI Campaign</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by name or content..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white placeholder-slate-500 bg-slate-950 transition-all"
          />
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { label: "All", value: "ALL" },
            { label: "Scheduled", value: "SCHEDULED" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Processing", value: "PROCESSING" },
            { label: "Draft", value: "DRAFT" },
            { label: "Cancelled", value: "CANCELLED" },
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

      {/* Campaigns Table */}
      <div className="bg-[#0B1120] rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-5">Campaign Name</th>
                <th className="py-3.5 px-5">Audience Batch</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Schedule / Completed</th>
                <th className="py-3.5 px-5">Dispatches</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length > 0 ? (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* Name */}
                    <td className="py-4 px-5">
                      <Link
                        href={`/campaigns/${camp.id}`}
                        className="font-bold text-white hover:text-blue-400 text-sm block transition-colors"
                      >
                        {camp.name}
                      </Link>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5 font-mono">
                        {camp.messageContent.slice(0, 60)}...
                      </p>
                    </td>

                    {/* Audience */}
                    <td className="py-4 px-5">
                      {camp.targetGroup ? (
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white inline-block shadow-sm"
                          style={{ backgroundColor: camp.targetGroup.color }}
                        >
                          {camp.targetGroup.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">All Contacts</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <StatusBadge status={camp.status} />
                    </td>

                    {/* Timing */}
                    <td className="py-4 px-5 text-slate-300 font-medium">
                      {camp.scheduledAt ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {new Date(camp.scheduledAt).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "short",
                              timeStyle: "short",
                            })}{" "}
                            IST
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Immediate</span>
                      )}
                    </td>

                    {/* Dispatch counts */}
                    <td className="py-4 px-5 text-slate-300">
                      <div>
                        <strong className="text-emerald-400 font-bold">{camp.successfulCount}</strong> /{" "}
                        <span className="text-slate-400 font-medium">{camp.totalRecipients}</span>
                      </div>
                      {camp.failedCount > 0 && (
                        <span className="text-[10px] text-rose-400 font-semibold block">
                          {camp.failedCount} skipped/failed
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/campaigns/${camp.id}`}
                          className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 font-semibold text-xs transition-colors"
                          title="View recipient snapshots and logs"
                        >
                          Details
                        </Link>

                        {camp.status === "SCHEDULED" && (
                          <>
                            <button
                              onClick={() => handleDispatchNow(camp.id)}
                              disabled={actionLoading === `dispatch_${camp.id}`}
                              className="p-1.5 rounded-xl text-blue-400 hover:bg-blue-500/15 border border-blue-500/25 transition-colors"
                              title="Run immediately"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancel(camp.id)}
                              disabled={actionLoading === `cancel_${camp.id}`}
                              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-rose-500/25 transition-colors"
                              title="Cancel scheduled campaign"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDuplicate(camp.id)}
                          disabled={actionLoading === `dup_${camp.id}`}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                          title="Duplicate campaign"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(camp.id)}
                          disabled={actionLoading === `del_${camp.id}`}
                          className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-rose-500/25 transition-colors"
                          title="Delete campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    No campaigns matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
    </div>
  );
}
