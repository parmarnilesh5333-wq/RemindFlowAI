"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  Calendar,
  Users,
  ShieldCheck,
  BarChart3,
  Globe,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  BellRing,
} from "lucide-react";

const BENEFITS_STRIP = [
  {
    label: "Natural Language Drafting",
    detail: "Prompt-to-template extraction",
    icon: Sparkles,
    color: "text-blue-400",
  },
  {
    label: "Multilingual Output",
    detail: "English, ગુજરાતી & हिंदी",
    icon: Globe,
    color: "text-indigo-400",
  },
  {
    label: "Timezone-Accurate Queue",
    detail: "Persistent SQLite scheduling",
    icon: Clock,
    color: "text-violet-400",
  },
  {
    label: "Consent-First Dispatch",
    detail: "Automatic opt-out protection",
    icon: ShieldCheck,
    color: "text-emerald-400",
  },
];

const FEATURES = [
  {
    title: "Smart Reminder Management",
    description:
      "Turn everyday instructions into structured reminder drafts with customizable templates and dynamic recipient variables.",
    icon: Sparkles,
    accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "Reliable Scheduling",
    description:
      "Plan reminders ahead of time with timezone-accurate scheduling and built-in safeguards that prevent duplicate dispatches.",
    icon: Clock,
    accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    title: "Simple Organization",
    description:
      "Keep contacts neatly structured in color-coded groups with validated phone formatting, search filters, and CSV import.",
    icon: Users,
    accent: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    title: "Multilingual Drafting",
    description:
      "Generate and preview complete reminder messages naturally in English, Gujarati (ગુજરાતી), and Hindi (हिंदी).",
    icon: Globe,
    accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "Consent & Privacy",
    description:
      "Respect recipient preferences with explicit opt-in tracking before dispatch and automatic STOP keyword suppression.",
    icon: ShieldCheck,
    accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    title: "Clear Activity Logs",
    description:
      "Review scheduled campaigns, recipient-level delivery statuses, and chronological audit trails in one organized place.",
    icon: BarChart3,
    accent: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Organize Your Contacts",
    description:
      "Add contacts individually or import a CSV list, group your audience into batches, and record opt-in consent.",
    badge: "Directory & Groups",
  },
  {
    step: "02",
    title: "Create Your Reminder",
    description:
      "Describe what you want to send in plain language and preview the generated draft in English, Gujarati, or Hindi.",
    badge: "AI Reminder Builder",
  },
  {
    step: "03",
    title: "Schedule & Stay on Track",
    description:
      "Choose your delivery time or run a safe simulation, then monitor campaign status from your workspace.",
    badge: "Automated Dispatch",
  },
];

export default function RemindFlowLandingPage() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) {
        setReduceMotion(true);
      }
      const listener = (e: MediaQueryListEvent) => {
        setReduceMotion(e.matches);
      };
      mq.addEventListener?.("change", listener);
      return () => mq.removeEventListener?.("change", listener);
    }
  }, []);

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      x: Number((normY * -7).toFixed(2)),
      y: Number((normX * 9).toFixed(2)),
    });
  };

  const handleStageMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
  };

  return (
    <div
      className={`min-h-screen futuristic-canvas text-slate-100 selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden font-sans ${
        reduceMotion ? "reduce-motion-active" : ""
      }`}
    >
      {/* =====================================================================
          1. NAVIGATION BAR
      ====================================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-[#050811]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-4 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group shrink-0 rounded-xl"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 p-[1px] shadow-[0_0_20px_-4px_rgba(59,130,246,0.5)]">
              <div className="w-full h-full rounded-[11px] bg-[#070B16] flex items-center justify-center">
                <BellRing className="w-4 h-4 text-blue-400 group-hover:text-violet-300 transition-colors" />
              </div>
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">
              RemindFlow <span className="text-blue-400">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300"
          >
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="hover:text-white transition-colors rounded-md px-1.5 py-1"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="hover:text-white transition-colors rounded-md px-1.5 py-1"
            >
              How It Works
            </a>
          </nav>

          {/* Desktop Enter Button & Mobile Menu Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-[0_8px_24px_-6px_rgba(37,99,235,0.55)] transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>Enter RemindFlow AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="md:hidden border-t border-slate-800/80 bg-[#070B16]/95 px-4 py-4 space-y-3"
          >
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60"
            >
              How It Works
            </a>
            <div className="pt-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)]"
              >
                <span>Enter RemindFlow AI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* =====================================================================
          2. CENTERED HERO SECTION & 3D DIMENSIONAL TIMEPIECE SHOWCASE
      ====================================================================== */}
      <section className="relative pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28 overflow-hidden">
        {/* Subtle Architectural Grid & Centered Ambient Lighting */}
        <div
          className="absolute inset-0 futuristic-grid-overlay pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 w-[680px] h-[340px] bg-gradient-to-r from-blue-600/14 via-indigo-600/16 to-violet-600/14 blur-[130px] rounded-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Centered Headline, Subtitle & Hero CTAs */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Centered Pill Label */}
          <div className="animate-hero-enter inline-flex items-center justify-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800/90 text-xs font-semibold text-slate-300 mx-auto shadow-inner">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>RemindFlow AI • Intelligent Scheduling &amp; Reminder Platform</span>
          </div>

          {/* Exact Centered Hero Headline */}
          <h1 className="animate-hero-enter-delay-1 mt-7 text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-extrabold tracking-tight text-white leading-[1.08] max-w-3xl mx-auto">
            Every reminder,{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              right on time.
            </span>
          </h1>

          {/* Centered Subtitle */}
          <p className="animate-hero-enter-delay-1 mt-6 text-base sm:text-lg md:text-xl text-slate-300/90 font-normal leading-relaxed max-w-2xl mx-auto">
            Stay organized, remember what matters, and keep your day moving with RemindFlow AI.
          </p>

          {/* Centered Primary & Secondary CTA Buttons */}
          <div className="animate-hero-enter-delay-2 mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold text-sm sm:text-base shadow-[0_14px_34px_-8px_rgba(37,99,235,0.6),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>Enter RemindFlow AI</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 font-semibold text-sm sm:text-base border border-slate-800 hover:border-slate-700 transition-all duration-200"
            >
              <span>Discover Features</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </a>
          </div>
        </div>

        {/* ===================================================================
            3D HERO VISUAL STAGE (Dimensional Chronometer/Calendar + Floating
            Layered Reminder Cards — Zero Private User Data or Live Dashboard)
        ==================================================================== */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-16">
          <div
            data-testid="abstract-time-showcase"
            onMouseMove={handleStageMouseMove}
            onMouseLeave={handleStageMouseLeave}
            className="futuristic-glass-panel rounded-3xl p-6 sm:p-10 lg:p-12 relative overflow-hidden scene-3d"
          >
            {/* Ambient Stage Lighting & Floor Reflection */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[240px] bg-blue-500/15 blur-[90px] rounded-full pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[480px] h-[180px] bg-violet-500/15 blur-[85px] rounded-full pointer-events-none"
              aria-hidden="true"
            />

            {/* 3D Interactive Stage Container */}
            <div
              className="relative z-10 preserve-3d transition-transform duration-300 ease-out"
              style={
                reduceMotion
                  ? undefined
                  : {
                      transform: `perspective(1400px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    }
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* LEFT COLUMN: 2 Layered 3D Floating Reminder Concept Cards */}
                <div className="lg:col-span-4 space-y-5 order-2 lg:order-1">
                  {/* Floating Card Left 1 */}
                  <div className="saas-3d-card animate-card-left-1 rounded-2xl p-4 text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3 text-blue-400" />
                        Scheduled • 10:00 AM
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">IST</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      Morning Schedule Reminder
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Automated batch notification queued with timezone lock.
                    </p>
                  </div>

                  {/* Floating Card Left 2 */}
                  <div className="saas-3d-card animate-card-left-2 rounded-2xl p-4 text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                        <Globe className="w-3 h-3 text-indigo-400" />
                        Multilingual Draft
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">Ready</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      English • ગુજરાતી • हिंदी
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Localized reminder templates with dynamic variables.
                    </p>
                  </div>
                </div>

                {/* CENTER COLUMN: 3D Dimensional Chronometer & Calendar Sculpture */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2 py-2">
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center animate-float-slow">
                    {/* Outer 3D Orbital Halo */}
                    <div
                      className="absolute inset-0 rounded-full border border-dashed border-blue-400/30 animate-orbit-pulse"
                      aria-hidden="true"
                    />
                    {/* Tilted Perspective Ring */}
                    <div
                      className="absolute inset-3 rounded-full border border-indigo-400/25 shadow-[0_0_40px_-8px_rgba(99,102,241,0.35)]"
                      style={{ transform: "rotateX(24deg) rotateY(-14deg)" }}
                      aria-hidden="true"
                    />

                    {/* Central 3D Beveled Chronometer Core */}
                    <div className="saas-3d-core relative w-44 h-44 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center p-4">
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full overflow-visible"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        role="img"
                        aria-label="3D dimensional timepiece and calendar core"
                      >
                        {/* Precision Dial Ticks */}
                        <circle
                          cx="100"
                          cy="100"
                          r="84"
                          stroke="url(#dialGrad3D)"
                          strokeWidth="1.5"
                          strokeDasharray="3 7"
                        />
                        <line x1="100" y1="20" x2="100" y2="30" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="180" y1="100" x2="170" y2="100" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="100" y1="180" x2="100" y2="170" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
                        <line x1="20" y1="100" x2="30" y2="100" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Diagonal Sub-ticks */}
                        <line x1="156" y1="44" x2="149" y2="51" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="156" y1="156" x2="149" y2="149" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="44" y1="156" x2="51" y2="149" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="44" y1="44" x2="51" y2="51" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

                        {/* Inner Glowing Ring */}
                        <circle
                          cx="100"
                          cy="100"
                          r="62"
                          fill="#070B16"
                          fillOpacity="0.85"
                          stroke="url(#dialGrad3D)"
                          strokeWidth="1.75"
                        />

                        {/* Dimensional Clock Hands (10:10 Precision Position) */}
                        <line
                          x1="100"
                          y1="100"
                          x2="74"
                          y2="80"
                          stroke="#F8FAFC"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        <line
                          x1="100"
                          y1="100"
                          x2="134"
                          y2="72"
                          stroke="#60A5FA"
                          strokeWidth="2.75"
                          strokeLinecap="round"
                        />
                        <circle cx="100" cy="100" r="5.5" fill="#6366F1" stroke="#FFFFFF" strokeWidth="2" />

                        {/* Orbital Satellite Nodes */}
                        <circle cx="159" cy="41" r="4" fill="#60A5FA" />
                        <circle cx="41" cy="159" r="3.5" fill="#A78BFA" />

                        <defs>
                          <linearGradient id="dialGrad3D" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#60A5FA" />
                            <stop offset="0.5" stopColor="#6366F1" />
                            <stop offset="1" stopColor="#A78BFA" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Floating Pill Inside Base of Core */}
                      <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-[#0B1120] border border-blue-500/35 shadow-lg text-[10px] font-bold tracking-wider uppercase text-blue-300">
                        On-Time Engine
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: 2 Layered 3D Floating Reminder Concept Cards */}
                <div className="lg:col-span-4 space-y-5 order-3">
                  {/* Floating Card Right 1 */}
                  <div className="saas-3d-card animate-card-right-1 rounded-2xl p-4 text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3 text-violet-400" />
                        Batch Organization
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">E.164</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      Structured Audience Groups
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Segment contacts by class, council, or group in seconds.
                    </p>
                  </div>

                  {/* Floating Card Right 2 */}
                  <div className="saas-3d-card animate-card-right-2 rounded-2xl p-4 text-left">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Consent Verified
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400">Protected</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white">
                      Automated Opt-Out Guard
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Checks opt-in status and suppression rules before every run.
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtle Bottom Reflection Bar */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Designed for clear scheduling, multilingual drafting, and verified consent</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReduceMotion((prev) => !prev)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 transition-colors"
                >
                  {reduceMotion ? "Enable 3D Motion" : "Pause 3D Motion"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            3. REFINED BENEFITS STRIP (Genuine Product Capabilities Only)
        ==================================================================== */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {BENEFITS_STRIP.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl bg-[#090E1C]/90 border border-slate-800/80 px-4 py-3.5 flex items-center gap-3.5"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.label}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. FEATURES SECTION (#features)
      ====================================================================== */}
      <section
        id="features"
        className="py-20 sm:py-28 border-t border-slate-800/70 bg-[#070B16]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Centered Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider text-blue-400">
              Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything you need to keep reminders on schedule.
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              RemindFlow AI combines natural-language drafting, contact organization, and responsible scheduling in one streamlined workspace.
            </p>
          </div>

          {/* Balanced 3-Column Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="futuristic-glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between text-left"
                >
                  <div className="space-y-4">
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center ${feature.accent}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          5. HOW IT WORKS SECTION (#how-it-works)
      ====================================================================== */}
      <section
        id="how-it-works"
        className="py-20 sm:py-28 border-t border-slate-800/70"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Centered Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold uppercase tracking-wider text-violet-400">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Simple workflow from start to finish.
            </h2>
            <p className="text-base text-slate-400 leading-relaxed">
              Set up your audience, prepare your message, and schedule reminders in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div
                key={item.step}
                className="futuristic-glass-card rounded-2xl p-6 sm:p-7 space-y-4 text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 font-mono font-bold text-xs">
                    {item.step}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-full">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. POLISHED CLOSING CTA
      ====================================================================== */}
      <section className="py-20 sm:py-24 border-t border-slate-800/70 bg-[#070B16]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="futuristic-glass-panel rounded-3xl p-8 sm:p-14 text-center space-y-6">
            <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Simulation Mode Active</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to stay on track?
            </h2>

            <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
              Open the RemindFlow AI workspace to organize contacts, draft multilingual reminders, and manage your scheduled campaigns.
            </p>

            <div className="pt-2 flex justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-semibold text-sm sm:text-base shadow-[0_12px_32px_-8px_rgba(37,99,235,0.55)] transition-all duration-200 hover:-translate-y-0.5"
              >
                <span>Enter RemindFlow AI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. PROFESSIONAL FOOTER
      ====================================================================== */}
      <footer className="border-t border-slate-800/80 bg-[#040710] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white">RemindFlow AI</span>
            <span className="text-slate-700">•</span>
            <span>Smart Reminder &amp; Campaign Management</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-400">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="hover:text-white transition-colors"
            >
              How It Works
            </a>
            <Link
              href="/dashboard"
              className="hover:text-white transition-colors"
            >
              Enter RemindFlow AI
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
