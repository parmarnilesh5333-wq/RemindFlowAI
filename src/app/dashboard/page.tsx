"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Send,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  Play,
  Activity,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface DashboardData {
  stats: {
    totalContacts: number;
    consentingContacts: number;
    optedOutContacts: number;
    totalGroups: number;
    totalCampaigns: number;
    statusCounts: Record<string, number>;
    totalDispatches: number;
    successfulDispatches: number;
    failedDispatches: number;
    deliverySuccessRate: number;
  };
  upcomingCampaigns: Array<{
    id: string;
    name: string;
    scheduledAt: string;
    status: string;
    targetGroup?: { name: string; color: string };
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    totalRecipients: number;
    successfulCount: number;
    failedCount: number;
    updatedAt: string;
    targetGroup?: { name: string; color: string };
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    details: string | null;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDispatchNow = async (id: string) => {
    try {
      setActionLoading(id);
      const res = await fetch(`/api/campaigns/${id}/dispatch-now`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        await fetchStats();
      } else {
        alert(json.error || "Dispatch failed");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-semibold tracking-wide">Loading live database analytics...</p>
      </div>
    );
  }

  const stats = data?.stats || {
    totalContacts: 0,
    consentingContacts: 0,
    optedOutContacts: 0,
    totalGroups: 0,
    totalCampaigns: 0,
    statusCounts: {},
    totalDispatches: 0,
    successfulDispatches: 0,
    failedDispatches: 0,
    deliverySuccessRate: 100,
  };

  const consentPercentage =
    stats.totalContacts > 0
      ? Math.round((stats.consentingContacts / stats.totalContacts) * 100)
      : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Executive Workspace Overview Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0B1224] via-[#0D162D] to-[#090E1C] p-7 sm:p-8 text-slate-100 overflow-hidden border border-slate-800/90 shadow-luxury">
        {/* Restrained ambient lighting */}
        <div className="absolute right-[-30px] top-[-40px] w-72 h-72 rounded-full bg-blue-600/12 blur-3xl pointer-events-none" />
        <div className="absolute right-40 bottom-[-50px] w-60 h-60 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-semibold border border-blue-500/25">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Workspace Command Center • Apex Coaching & Academy</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Your reminders, organized with precision.
            </h2>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Coordinate scheduled campaigns across <strong className="text-white font-semibold">{stats.totalContacts} contacts</strong> and <strong className="text-white font-semibold">{stats.totalGroups} active batches</strong>. Automated compliance checks verify recipient consent before every dispatch.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/ai-builder"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>+ Create Reminder</span>
            </Link>

            <Link
              href="/contacts"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl text-xs sm:text-sm border border-slate-700/80 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>Import Contacts</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <Card interactive className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Contacts
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">{stats.totalContacts}</span>
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {stats.consentingContacts} Consenting
            </span>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Opted-out / Suppressed:</span>
              <span className="font-bold text-rose-400">{stats.optedOutContacts}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
                style={{ width: `${consentPercentage}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Active Groups */}
        <Card interactive className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Audience Batches
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{stats.totalGroups}</span>
            <span className="text-xs text-slate-400 font-medium">Batches & Councils</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
            <Link href="/contacts" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold">
              Manage Batches →
            </Link>
          </div>
        </Card>

        {/* Total Campaigns */}
        <Card interactive className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Reminders & Notices
            </span>
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">{stats.totalCampaigns}</span>
            <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
              {stats.statusCounts?.SCHEDULED || 0} Scheduled
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
            <span>Completed:</span>
            <span className="font-bold text-emerald-400">{stats.statusCounts?.COMPLETED || 0}</span>
          </div>
        </Card>

        {/* Delivery Success Rate */}
        <Card interactive className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Delivery Success
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">{stats.deliverySuccessRate}%</span>
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              Verified
            </span>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Messages Processed:</span>
              <span className="font-bold text-slate-200">{stats.totalDispatches}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, stats.deliverySuccessRate)}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Campaign Lifecycle Pipeline Counts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Campaign Lifecycle Pipeline</h3>
            <p className="text-xs text-slate-400">Live operational counts partitioned by execution state</p>
          </div>
          <Link href="/campaigns" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
            View All Campaigns →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Draft", key: "DRAFT", color: "text-slate-200", bg: "bg-slate-900/90 border-slate-800 hover:border-slate-700" },
            { label: "Scheduled", key: "SCHEDULED", color: "text-amber-300", bg: "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" },
            { label: "Processing", key: "PROCESSING", color: "text-indigo-300", bg: "bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40" },
            { label: "Completed", key: "COMPLETED", color: "text-emerald-300", bg: "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40" },
            { label: "Failed", key: "FAILED", color: "text-rose-300", bg: "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40" },
            { label: "Cancelled", key: "CANCELLED", color: "text-slate-400", bg: "bg-slate-900/60 border-slate-800/80 hover:border-slate-700" },
          ].map((item) => {
            const count = stats.statusCounts?.[item.key] || 0;
            return (
              <Link
                key={item.key}
                href={`/campaigns?status=${item.key}`}
                className={`p-3.5 rounded-xl border ${item.bg} flex flex-col justify-between transition-all`}
              >
                <span className="text-xs font-semibold text-slate-400">{item.label}</span>
                <span className={`text-2xl font-extrabold mt-2 ${item.color}`}>{count}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* 4. Two Column Layout: Upcoming Scheduled Reminders & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Upcoming Scheduled Reminders & Recent Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Scheduled Reminders */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#080D1A]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Upcoming Scheduled Reminders
                </h3>
                <p className="text-xs text-slate-400">Persisted in database, locked against race conditions</p>
              </div>
              <Link href="/campaigns?status=SCHEDULED" className="text-xs font-semibold text-blue-400 hover:underline">
                See all scheduled
              </Link>
            </div>

            <div className="divide-y divide-slate-800/80">
              {data?.upcomingCampaigns && data.upcomingCampaigns.length > 0 ? (
                data.upcomingCampaigns.map((camp) => (
                  <div key={camp.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-900/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/campaigns/${camp.id}`} className="font-bold text-white text-sm hover:text-blue-400 transition-colors">
                          {camp.name}
                        </Link>
                        {camp.targetGroup && (
                          <span
                            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-sm"
                            style={{ backgroundColor: camp.targetGroup.color }}
                          >
                            {camp.targetGroup.name}
                          </span>
                        )}
                        <StatusBadge status={camp.status} />
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>Scheduled for:</span>
                        <span className="font-semibold text-slate-200">
                          {new Date(camp.scheduledAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          IST
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDispatchNow(camp.id)}
                        disabled={actionLoading === camp.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/25 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 text-blue-400" />
                        <span>{actionLoading === camp.id ? "Dispatching..." : "Run Now"}</span>
                      </button>
                      <Link
                        href={`/campaigns/${camp.id}`}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No scheduled campaigns</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Describe a reminder in natural language using the AI Reminder Builder to schedule reminders.
                  </p>
                  <Link
                    href="/ai-builder"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:underline"
                  >
                    Create your first reminder →
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Campaigns History Table */}
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#080D1A]">
              <div>
                <h3 className="text-base font-bold text-white">Recent Reminders Overview</h3>
                <p className="text-xs text-slate-400">History of dispatched notices and updates</p>
              </div>
              <Link href="/campaigns" className="text-xs font-semibold text-blue-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Campaign Name</th>
                    <th className="py-3.5 px-4">Audience</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Recipients</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                    data.recentCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">
                          <Link href={`/campaigns/${camp.id}`} className="hover:text-blue-400 transition-colors">
                            {camp.name}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          {camp.targetGroup ? (
                            <span
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-sm"
                              style={{ backgroundColor: camp.targetGroup.color }}
                            >
                              {camp.targetGroup.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">All</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={camp.status} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="font-bold text-emerald-400">{camp.successfulCount}</span> sent /{" "}
                          <span className="text-slate-400">{camp.totalRecipients} total</span>
                          {camp.failedCount > 0 && (
                            <span className="text-rose-400 ml-1 font-semibold">({camp.failedCount} skipped/failed)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/campaigns/${camp.id}`}
                            className="text-blue-400 hover:underline font-semibold"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No campaigns found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Quick Actions & Audit Trail */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quick Actions</h3>
            <div className="space-y-2.5">
              <Link
                href="/ai-builder"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-blue-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-blue-400">
                      Create AI Reminder
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Multilingual natural prompt</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/contacts"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-indigo-400">
                      Manage Contacts & Groups
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">CSV import & phone validation</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/consent"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-emerald-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-emerald-400">
                      Privacy & Suppression List
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Opt-outs & consent audit</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/reports"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-violet-500/40 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-violet-400">
                      Delivery & Carrier Logs
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Meta event tracking</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </Card>

          {/* Audit Trail Log */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Activity</h3>
              <span className="text-[11px] text-slate-400 font-semibold">Live Audit</span>
            </div>

            <div className="space-y-3">
              {data?.recentActivity && data.recentActivity.length > 0 ? (
                data.recentActivity.map((act) => (
                  <div key={act.id} className="text-xs border-l-2 border-blue-500/60 pl-3 py-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{act.action.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] block mt-0.5 font-medium">
                      Entity: {act.entityType}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No activity recorded yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
