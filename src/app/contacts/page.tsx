"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  X,
  RotateCcw,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { formatPhoneDisplay } from "@/lib/phone";

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<"contacts" | "groups">("contacts");

  // Contacts state
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("");
  const [consentFilter, setConsentFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  // Groups state
  const [groups, setGroups] = useState<any[]>([]);

  // Modals state
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    roleOrGrade: "Student",
    notes: "",
    consentStatus: "GRANTED",
    groupIds: [] as string[],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  // Group form state
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    color: "#6366F1",
  });
  const [groupError, setGroupError] = useState<string | null>(null);

  // CSV Import state
  const [csvText, setCsvText] = useState("");
  const [csvValidating, setCsvValidating] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any | null>(null);
  const [csvImportSummary, setCsvImportSummary] = useState<any | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Load contacts
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        search,
      });
      if (selectedGroupFilter) params.append("groupId", selectedGroupFilter);
      if (consentFilter !== "ALL") params.append("consentStatus", consentFilter);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts || []);
        const pagination = data.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        setTotalContacts(pagination.unfilteredTotal ?? pagination.total ?? (data.contacts?.length || 0));
        setFilteredCount(pagination.total ?? (data.contacts?.length || 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load groups
  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (res.ok) setGroups(data.groups || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, [page, pageSize, selectedGroupFilter, consentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedGroupFilter("");
    setConsentFilter("ALL");
    setPage(1);
  };

  const isFiltered = Boolean(search.trim() || selectedGroupFilter || consentFilter !== "ALL");

  // Save single contact
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    setFormError(null);

    const isEdit = Boolean(contactForm.id);
    const url = isEdit ? `/api/contacts/${contactForm.id}` : "/api/contacts";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save contact");

      setIsAddContactOpen(false);
      setIsEditContactOpen(false);
      fetchContacts();
      fetchGroups();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const handleEditClick = (c: any) => {
    setContactForm({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      roleOrGrade: c.roleOrGrade || "Student",
      notes: c.notes || "",
      consentStatus: c.consentStatus,
      groupIds: c.groups ? c.groups.map((g: any) => g.id) : [],
    });
    setFormError(null);
    setIsEditContactOpen(true);
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchContacts();
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create group");

      setIsAddGroupOpen(false);
      setGroupForm({ name: "", description: "", color: "#6366F1" });
      fetchGroups();
    } catch (err: any) {
      setGroupError(err.message);
    }
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Delete group "${name}"? Contacts in this group will not be deleted.`)) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  // CSV Dry Run validation
  const handleValidateCsv = async () => {
    if (!csvText.trim()) {
      setCsvError("Please provide CSV content to validate.");
      return;
    }
    setCsvValidating(true);
    setCsvError(null);
    setCsvPreview(null);
    setCsvImportSummary(null);

    try {
      const res = await fetch("/api/contacts/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      setCsvPreview(data);
    } catch (err: any) {
      setCsvError(err.message);
    } finally {
      setCsvValidating(false);
    }
  };

  // Confirm CSV Import
  const handleCommitCsvImport = async () => {
    setCsvValidating(true);
    setCsvError(null);

    try {
      const res = await fetch("/api/contacts/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvText, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setCsvImportSummary(data.summary);
      setCsvPreview(null);
      fetchContacts();
      fetchGroups();
    } catch (err: any) {
      setCsvError(err.message);
    } finally {
      setCsvValidating(false);
    }
  };

  const loadSampleCsv = () => {
    const sample = `Name,Phone,Email,Role,Group,Consent
Siddharth Sen,9876543301,siddharth@example.com,Student,Class 10 CBSE Maths,GRANTED
Priya Kulkarni,9876543302,priya@example.com,Parent,Parent Council,GRANTED
Sameer Joshi,9876543303,sameer@example.com,Student,Class 12 Physics,GRANTED
Kavita Roy,invalid-phone,kavita@example.com,Parent,Parent Council,GRANTED
Rohan Gupta,9876543304,rohan@example.com,Student,Weekend Robotics Club,REVOKED`;
    setCsvText(sample);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Contacts & Audience Groups</h2>
          <p className="text-sm text-slate-400 mt-1">
            Organize student, parent, and member directories with verified consent and E.164 phone normalization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCsvText("");
              setCsvPreview(null);
              setCsvImportSummary(null);
              setCsvError(null);
              setIsImportCsvOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              setContactForm({
                id: "",
                name: "",
                phone: "",
                email: "",
                roleOrGrade: "Student",
                notes: "",
                consentStatus: "GRANTED",
                groupIds: [],
              });
              setFormError(null);
              setIsAddContactOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Contact</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-3 ${
            activeTab === "contacts"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          All Contacts ({isFiltered ? `${filteredCount} of ${totalContacts}` : totalContacts})
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-3 ${
            activeTab === "groups"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          Manage Groups ({groups.length})
        </button>
      </div>

      {/* CONTACTS TAB */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-[#0B1120] p-4 sm:p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-medium text-white placeholder-slate-500 bg-slate-950 transition-all"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Group Filter */}
              <select
                value={selectedGroupFilter}
                onChange={(e) => {
                  setSelectedGroupFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-slate-800 rounded-xl px-3.5 py-2 bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              {/* Consent Filter */}
              <select
                value={consentFilter}
                onChange={(e) => {
                  setConsentFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-slate-800 rounded-xl px-3.5 py-2 bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Consent</option>
                <option value="GRANTED">Granted Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="REVOKED">Revoked / Opt-Out</option>
              </select>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {isFiltered && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs animate-fadeIn">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Filter className="w-3.5 h-3.5 text-blue-400" />
                  Active Filters:
                </span>

                {search.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-blue-500/30 text-slate-200 font-medium text-[11px]">
                    Search: &ldquo;{search}&rdquo;
                    <button
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedGroupFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-blue-500/30 text-slate-200 font-medium text-[11px]">
                    Group: {groups.find((g) => g.id === selectedGroupFilter)?.name || "Selected"}
                    <button
                      onClick={() => {
                        setSelectedGroupFilter("");
                        setPage(1);
                      }}
                      className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                      title="Clear group filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {consentFilter !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-blue-500/30 text-slate-200 font-medium text-[11px]">
                    Consent: {consentFilter}
                    <button
                      onClick={() => {
                        setConsentFilter("ALL");
                        setPage(1);
                      }}
                      className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                      title="Clear consent filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <span className="text-[11px] text-slate-300 font-medium ml-1">
                  ({filteredCount} of {totalContacts} contacts match)
                </span>
              </div>

              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 font-semibold text-[11px] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset all filters
              </button>
            </div>
          )}

          {/* Contacts Table */}
          <div className="bg-[#0B1120] rounded-2xl border border-slate-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#080D1A] text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-5">Contact Details</th>
                    <th className="py-3.5 px-5">Phone (E.164)</th>
                    <th className="py-3.5 px-5">Groups / Batches</th>
                    <th className="py-3.5 px-5">Consent Status</th>
                    <th className="py-3.5 px-5">Privacy Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading contacts...
                      </td>
                    </tr>
                  ) : contacts.length > 0 ? (
                    contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <strong className="text-white font-bold block text-sm">{c.name}</strong>
                          <span className="text-[11px] text-slate-400">
                            {c.roleOrGrade ? `${c.roleOrGrade} • ` : ""}
                            {c.email || "No email"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-200 font-medium">
                          {formatPhoneDisplay(c.phone)}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex flex-wrap gap-1">
                            {c.groups && c.groups.length > 0 ? (
                              c.groups.map((g: any) => (
                                <span
                                  key={g.id}
                                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-sm"
                                  style={{ backgroundColor: g.color || "#6366F1" }}
                                >
                                  {g.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[11px]">No group</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusBadge status={c.consentStatus} />
                        </td>
                        <td className="py-3.5 px-5">
                          {c.optOutStatus ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/25">
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              <span>OPTED OUT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(c)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                              title="Edit contact"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(c.id, c.name)}
                              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-rose-500/25 transition-colors"
                              title="Delete contact"
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
                        No contacts found. Use &quot;+ Add Contact&quot; or &quot;Import CSV&quot; to populate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls & Record Status Bar */}
            <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-[#080D1A]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  Showing <strong className="text-white font-bold">{filteredCount === 0 ? 0 : (page - 1) * pageSize + 1}</strong> to{" "}
                  <strong className="text-white font-bold">{Math.min(page * pageSize, filteredCount)}</strong> of{" "}
                  <strong className="text-white font-bold">{filteredCount}</strong> contacts
                  {isFiltered && totalContacts > filteredCount && (
                    <span className="text-slate-400 font-semibold ml-1">
                      (filtered from {totalContacts} total)
                    </span>
                  )}
                </span>

                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[11px] text-slate-500 font-medium">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="text-[11px] font-semibold border border-slate-800 rounded-lg px-2 py-1 bg-slate-950 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Page navigation controls */}
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      page === pageNum
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GROUPS TAB */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Audience Groups & Batches</h3>
            <button
              onClick={() => {
                setGroupForm({ name: "", description: "", color: "#6366F1" });
                setGroupError(null);
                setIsAddGroupOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div
                key={g.id}
                className="bg-[#0B1120] p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-800"
                      style={{ backgroundColor: g.color || "#6366F1" }}
                    />
                    <button
                      onClick={() => handleDeleteGroup(g.id, g.name)}
                      className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-white mt-3">{g.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {g.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    <strong className="text-white font-bold">{g.memberCount ?? 0}</strong> contacts
                  </span>
                  <button
                    onClick={() => {
                      setSelectedGroupFilter(g.id);
                      setActiveTab("contacts");
                    }}
                    className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors"
                  >
                    Filter Contacts →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CONTACT */}
      <Modal
        isOpen={isAddContactOpen || isEditContactOpen}
        onClose={() => {
          setIsAddContactOpen(false);
          setIsEditContactOpen(false);
        }}
        title={contactForm.id ? "Edit Contact" : "Add New Contact"}
        description="Normalize phone number to international E.164 format and link to audience groups."
      >
        <form onSubmit={handleSaveContact} className="space-y-4 text-xs">
          {formError && <Alert type="error">{formError}</Alert>}

          <div>
            <label className="font-bold text-slate-300 block mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
              placeholder="e.g. Aarav Patel"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              placeholder="e.g. 9876543210 or +919876543210"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-mono text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Will be automatically normalized to E.164 format (e.g. +919876543210).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Email (Optional)</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="aarav@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Role / Batch Type</label>
              <input
                type="text"
                value={contactForm.roleOrGrade}
                onChange={(e) => setContactForm({ ...contactForm, roleOrGrade: e.target.value })}
                placeholder="Student, Parent, Staff..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Consent Status</label>
            <select
              value={contactForm.consentStatus}
              onChange={(e) => setContactForm({ ...contactForm, consentStatus: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs bg-slate-950 text-white font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="GRANTED">GRANTED (Explicit consent on record)</option>
              <option value="PENDING">PENDING (Awaiting confirmation)</option>
              <option value="REVOKED">REVOKED (Opted out / suppressed)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Assign to Groups</label>
            <div className="max-h-32 overflow-y-auto border border-slate-800 rounded-xl p-2.5 space-y-1 bg-slate-950">
              {groups.map((g) => (
                <label key={g.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={contactForm.groupIds.includes(g.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setContactForm({ ...contactForm, groupIds: [...contactForm.groupIds, g.id] });
                      } else {
                        setContactForm({
                          ...contactForm,
                          groupIds: contactForm.groupIds.filter((id) => id !== g.id),
                        });
                      }
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-200 font-semibold">{g.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAddContactOpen(false);
                setIsEditContactOpen(false);
              }}
              className="px-4 py-2.5 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingContact}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] disabled:opacity-50 transition-all"
            >
              {savingContact ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE GROUP */}
      <Modal
        isOpen={isAddGroupOpen}
        onClose={() => setIsAddGroupOpen(false)}
        title="Create Audience Group"
        description="Create reusable batches and groups for targeting reminders."
      >
        <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
          {groupError && <Alert type="error">{groupError}</Alert>}

          <div>
            <label className="font-bold text-slate-300 block mb-1">Group Name *</label>
            <input
              type="text"
              required
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="e.g. Class 10 CBSE Maths"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Description</label>
            <textarea
              rows={2}
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              placeholder="Morning batch for board exams..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-slate-950 transition-all"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Badge Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={groupForm.color}
                onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
                className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer p-0.5"
              />
              <span className="font-mono text-slate-300 font-semibold">{groupForm.color}</span>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddGroupOpen(false)}
              className="px-4 py-2.5 border border-slate-800 rounded-xl text-slate-300 hover:bg-slate-800 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] transition-all"
            >
              Create Group
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: IMPORT CSV */}
      <Modal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        title="Import Contacts from CSV"
        description="Upload CSV with column mapping. Valid rows are imported; invalid rows are reported without discarding the valid dataset."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {csvError && <Alert type="error">{csvError}</Alert>}

          {/* Import Summary */}
          {csvImportSummary && (
            <Alert type="success" title="Import Completed Successfully!">
              <div className="space-y-1 text-xs">
                <p>
                  <strong>{csvImportSummary.importedCount}</strong> new contacts imported,{" "}
                  <strong>{csvImportSummary.updatedCount}</strong> existing contacts updated.
                </p>
                {csvImportSummary.invalidCount > 0 && (
                  <p className="text-amber-300">
                    <strong>{csvImportSummary.invalidCount}</strong> invalid rows were skipped.
                  </p>
                )}
              </div>
            </Alert>
          )}

          {!csvImportSummary && (
            <>
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300">Paste or Load CSV Content:</label>
                <button
                  type="button"
                  onClick={loadSampleCsv}
                  className="text-blue-400 hover:text-blue-300 hover:underline font-semibold transition-colors"
                >
                  Load Sample Data
                </button>
              </div>

              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Name,Phone,Email,Role,Group,Consent&#10;Aarav Patel,9876543210,aarav@test.com,Student,Class 10,GRANTED"
                className="w-full p-4 font-mono text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-white bg-slate-950 transition-all"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleValidateCsv}
                  disabled={csvValidating || !csvText.trim()}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold border border-slate-700 disabled:opacity-50 transition-all"
                >
                  {csvValidating ? "Validating..." : "Step 1: Validate CSV"}
                </button>
              </div>

              {/* Validation Preview */}
              {csvPreview && (
                <div className="space-y-3 pt-3 border-t border-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">Validation Summary</h4>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-semibold">
                        {csvPreview.validCount} Valid Rows
                      </span>
                      {csvPreview.invalidCount > 0 && (
                        <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/25 font-semibold">
                          {csvPreview.invalidCount} Invalid Rows
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Invalid rows report */}
                  {csvPreview.invalidRows && csvPreview.invalidRows.length > 0 && (
                    <div className="p-3.5 bg-rose-500/10 rounded-xl border border-rose-500/25 text-rose-200 space-y-1">
                      <span className="font-bold text-white">Errors Found:</span>
                      {csvPreview.invalidRows.map((r: any, idx: number) => (
                        <p key={idx} className="text-[11px]">
                          Row #{r.rowNumber}: {r.errors.join(", ")}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-indigo-200 text-[11px]">
                    <strong className="text-white">Privacy Notice:</strong> Imported consent values are treated as user-provided information, not independently verified proof. Consent audit source tagged as CSV_IMPORT.
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleCommitCsvImport}
                      disabled={csvValidating || csvPreview.validCount === 0}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-[0_6px_20px_-4px_rgba(37,99,235,0.5)] disabled:opacity-50 transition-all"
                    >
                      {csvValidating
                        ? "Importing..."
                        : `Step 2: Import ${csvPreview.validCount} Valid Contacts`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {csvImportSummary && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsImportCsvOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
