"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Send,
  Users,
  ShieldCheck,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
  Clock,
  RefreshCw,
  Info,
  ChevronRight,
  ExternalLink,
  BellRing,
} from "lucide-react";
import clsx from "clsx";
import { ServerControlWidget } from "@/components/layout/ServerControlWidget";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTickLoading, setIsTickLoading] = useState(false);
  const [tickMessage, setTickMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerSchedulerTick = async () => {
    setIsTickLoading(true);
    setTickMessage(null);
    try {
      const res = await fetch("/api/scheduler/tick", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const count = data.result?.processedCount || 0;
        setTickMessage(
          count > 0
            ? `Scheduler checked: Dispatched ${count} campaign(s)!`
            : "Scheduler checked: No due campaigns at this moment."
        );
        setTimeout(() => setTickMessage(null), 4000);
      }
    } catch (e) {
      setTickMessage("Scheduler tick check failed");
    } finally {
      setIsTickLoading(false);
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "AI Reminder Builder",
      href: "/ai-builder",
      icon: Sparkles,
      badge: "AI Powered",
    },
    {
      label: "Campaigns",
      href: "/campaigns",
      icon: Send,
    },
    {
      label: "Contacts & Groups",
      href: "/contacts",
      icon: Users,
    },
    {
      label: "Consent & Privacy",
      href: "/consent",
      icon: ShieldCheck,
    },
    {
      label: "Reports & Logs",
      href: "/reports",
      icon: BarChart3,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: SettingsIcon,
    },
  ];

  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname === "/ai-builder") return "AI Reminder Builder";
    if (pathname.startsWith("/campaigns/")) return "Campaign Details";
    if (pathname === "/campaigns") return "Campaigns Hub";
    if (pathname === "/contacts") return "Contacts & Groups";
    if (pathname === "/consent") return "Consent & Privacy";
    if (pathname === "/reports") return "Reports & Logs";
    if (pathname === "/settings") return "Settings & Health";
    return "Workspace";
  };

  // Render full-bleed landing page at "/" and login page at "/login" without the internal dashboard shell
  if (pathname === "/" || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col antialiased text-slate-100 selection:bg-blue-500/30 selection:text-blue-100 font-sans">
      {/* Top Banner: Visible Simulation Mode Disclosure & Server ON/OFF Controls */}
      <div className="bg-[#040710] text-slate-300 border-b border-slate-800/80 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            SIMULATION MODE ACTIVE
          </span>
          <span className="text-slate-400 text-[11px] hidden lg:inline">
            Meta WhatsApp credentials not configured. Safe simulation mode active.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-400">
          <ServerControlWidget variant="compact" />
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] pl-2 border-l border-slate-800">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono text-slate-200 font-semibold">{currentTime || "Loading..."}</span> IST
          </span>
          <Link
            href="/settings"
            className="text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-0.5 text-[11px] transition-colors"
          >
            Server & API Settings <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Dark Navy Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-[#080C18] border-r border-slate-800/80 text-slate-100 flex-shrink-0">
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 p-[1px] shadow-[0_0_20px_-4px_rgba(59,130,246,0.45)] group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-[11px] bg-[#080C18] flex items-center justify-center">
                  <BellRing className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1">
                  RemindFlow <span className="text-blue-400 font-extrabold">AI</span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5 font-medium">Reminder Operations SaaS</span>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                    isActive
                      ? "bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent text-white border-l-2 border-blue-400 shadow-[0_2px_12px_rgba(37,99,235,0.12)]"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={clsx(
                        "w-4 h-4 transition-colors",
                        isActive ? "text-blue-400" : "text-slate-500 group-hover:text-blue-400"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={clsx(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide",
                        isActive
                          ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
                          : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Return to Welcome Landing Page */}
            <div className="pt-3 mt-3 border-t border-slate-800/80">
              <Link
                href="/"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900/80 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  <span>Welcome Page</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/80">
                  Home
                </span>
              </Link>
            </div>
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-[#060913]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/30 flex items-center justify-center font-bold text-white text-xs shadow-inner">
                RS
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Dr. Rajesh Sharma</p>
                <p className="text-[11px] text-slate-400 truncate">Apex Coaching & Academy</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#080C18] border-r border-slate-800 text-white z-50 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white font-black text-xs">
                    RF
                  </div>
                  <span className="font-bold text-white text-sm">RemindFlow AI</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={clsx(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold",
                        isActive
                          ? "bg-blue-600/20 text-white border-l-2 border-blue-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
                <div className="pt-2 mt-2 border-t border-slate-800">
                  <Link
                    href="/"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                      <span>Welcome Page</span>
                    </div>
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Header */}
          <header className="sticky top-0 z-30 bg-[#080C18]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-xl text-slate-300 hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Link href="/" className="hover:text-white transition-colors">
                    Welcome
                  </Link>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    Dashboard
                  </Link>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span className="text-slate-200 font-semibold">{getBreadcrumb()}</span>
                </div>
                <h1 className="text-lg font-bold text-white tracking-tight">{getBreadcrumb()}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Scheduler Run Trigger */}
              <button
                onClick={triggerSchedulerTick}
                disabled={isTickLoading}
                title="Process due scheduled reminders now"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all disabled:opacity-50"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5 text-indigo-400", isTickLoading && "animate-spin")} />
                <span>Run Scheduler</span>
              </button>

              {/* Quick AI Reminder Action */}
              <Link
                href="/ai-builder"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-xs font-semibold shadow-[0_4px_16px_-4px_rgba(37,99,235,0.5)] transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ Create AI Reminder</span>
              </Link>
            </div>
          </header>

          {/* Scheduler notification toast if any */}
          {tickMessage && (
            <div className="bg-indigo-500/15 border-b border-indigo-500/30 px-6 py-2.5 text-xs text-indigo-200 font-semibold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>{tickMessage}</span>
              </div>
              <button onClick={() => setTickMessage(null)} className="text-indigo-300 hover:text-white font-bold">
                ×
              </button>
            </div>
          )}

          {/* Page Contents */}
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>

          {/* Footer */}
          <footer className="mt-auto border-t border-slate-800/80 bg-[#080C18]/90 py-4 px-6 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-white">RemindFlow AI</span> — Intelligent Reminder & Campaign Operations Platform. Official Meta WhatsApp Cloud API Ready.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/consent" className="hover:text-blue-400 transition-colors font-medium">
                Privacy & Consent
              </Link>
              <Link href="/settings" className="hover:text-blue-400 transition-colors font-medium">
                API Diagnostics
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
