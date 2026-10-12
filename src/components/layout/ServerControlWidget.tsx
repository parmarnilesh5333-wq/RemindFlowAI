"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Power,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Server,
  Terminal,
} from "lucide-react";
import clsx from "clsx";

export type ServerState = "RUNNING" | "STOPPED" | "STARTING";

interface ServerControlWidgetProps {
  variant?: "compact" | "card";
}

const CONTROLLER_URL = "http://localhost:3030";
const APP_URL = "http://localhost:3000";

export function ServerControlWidget({ variant = "compact" }: ServerControlWidgetProps) {
  const [state, setState] = useState<ServerState>("RUNNING");
  const [pid, setPid] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [controllerOnline, setControllerOnline] = useState<boolean>(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Verify whether http://localhost:3000/api/health responds with HTTP 200
   */
  const verifyAppHealth = useCallback(async (timeoutMs = 2500): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch("/api/health", {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  /**
   * Poll live status from the Local Server Controller (port 3030) or fallback to /api/server-control
   */
  const checkServerStatus = useCallback(async () => {
    // 1. Try local controller on port 3030 first (works even when port 3000 is STOPPED)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${CONTROLLER_URL}/status`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (!isMounted.current) return;
        setControllerOnline(true);
        if (data.starting || data.state === "STARTING") {
          setState("STARTING");
        } else if (data.running || data.state === "RUNNING") {
          setState("RUNNING");
          setError(null);
        } else {
          setState("STOPPED");
        }
        setPid(data.pid ?? null);
        if (data.error) {
          setError(data.error);
        }
        return;
      }
    } catch {
      // Port 3030 controller not yet reachable; try Next.js API route (which also auto-starts port 3030)
    }

    // 2. Fallback to Next.js /api/server-control (if port 3000 is currently running)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch("/api/server-control", {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (!isMounted.current) return;
        setControllerOnline(Boolean(data.controllerActive));
        setState("RUNNING");
        setPid(data.pid ?? null);
        setError(null);
        return;
      }
    } catch {
      // Both port 3030 and port 3000 failed to respond
    }

    // 3. Final check on /api/health
    const healthy = await verifyAppHealth(1500);
    if (!isMounted.current) return;
    if (healthy) {
      setState("RUNNING");
      setError(null);
    } else {
      setState("STOPPED");
    }
  }, [verifyAppHealth]);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 4000);
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  /**
   * Start Server (Server ON) handler with duplicate process prevention & readiness verification
   */
  const handleStartServer = async () => {
    if (actionInProgress || state === "STARTING") return;

    // If already running, verify and do not start a duplicate instance
    if (state === "RUNNING") {
      const healthy = await verifyAppHealth(1500);
      if (healthy) {
        setStatusMessage("Server is already running on http://localhost:3000 (duplicate start prevented).");
        setTimeout(() => isMounted.current && setStatusMessage(null), 4000);
        return;
      }
    }

    setActionInProgress(true);
    setError(null);
    setStatusMessage(null);
    setState("STARTING");

    try {
      let responseData: any = null;
      let startedViaController = false;

      // Call port 3030 controller directly (works when port 3000 is stopped)
      try {
        const res = await fetch(`${CONTROLLER_URL}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        responseData = await res.json().catch(() => ({}));
        if (!res.ok || responseData.error) {
          throw new Error(responseData.error || "Failed to start server via controller.");
        }
        startedViaController = true;
      } catch (controllerErr: any) {
        // Fallback: try /api/server-control if port 3000 is reachable
        try {
          const fallbackRes = await fetch("/api/server-control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          });
          responseData = await fallbackRes.json().catch(() => ({}));
          if (!fallbackRes.ok || responseData.error) {
            throw new Error(
              responseData.error ||
                "Cannot reach local Server Controller on port 3030. Please run start-remindflow.bat or server-control.bat."
            );
          }
          startedViaController = true;
        } catch {
          throw new Error(
            controllerErr?.message && !controllerErr.message.includes("Failed to fetch")
              ? controllerErr.message
              : "Server is stopped and Local Controller (port 3030) is offline. Run start-remindflow.bat or npm run server:start to turn Server ON."
          );
        }
      }

      if (startedViaController) {
        // Poll readiness on http://localhost:3000/api/health before showing Running
        let isReady = false;
        for (let attempt = 0; attempt < 25; attempt++) {
          const healthy = await verifyAppHealth(2000);
          if (healthy) {
            isReady = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }

        if (!isMounted.current) return;

        if (isReady || responseData?.running) {
          setState("RUNNING");
          setPid(responseData?.pid ?? null);
          setError(null);
          setStatusMessage(
            responseData?.alreadyRunning
              ? "Server is already running on http://localhost:3000."
              : "Server started and verified ready at http://localhost:3000!"
          );
          setTimeout(() => isMounted.current && setStatusMessage(null), 5000);
        } else {
          setState("STOPPED");
          setError("Server process launched, but readiness check on http://localhost:3000/api/health timed out.");
        }
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      setState("STOPPED");
      setError(err?.message || "Failed to start RemindFlow AI server.");
    } finally {
      if (isMounted.current) {
        setActionInProgress(false);
      }
    }
  };

  /**
   * Stop Server (Server OFF) handler
   */
  const handleStopServer = async () => {
    if (actionInProgress || state === "STOPPED" || state === "STARTING") return;

    setActionInProgress(true);
    setError(null);
    setStatusMessage(null);

    try {
      // Ensure controller on port 3030 is awake before stopping port 3000 so the user can start it back up!
      try {
        await fetch("/api/server-control", { cache: "no-store" });
      } catch {
        // Ignore if already offline
      }

      let stoppedOk = false;
      try {
        const res = await fetch(`${CONTROLLER_URL}/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.state === "STOPPED" || !data.running)) {
          stoppedOk = true;
        }
      } catch {
        // Fallback to /api/server-control
        const res = await fetch("/api/server-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        });
        if (res.ok) {
          stoppedOk = true;
        }
      }

      if (!isMounted.current) return;

      if (stoppedOk) {
        setState("STOPPED");
        setPid(null);
        setStatusMessage("Server stopped (Server OFF). Click 'Start Server (Server ON)' anytime to restart.");
        setTimeout(() => isMounted.current && setStatusMessage(null), 6000);
      } else {
        setError("Could not stop the server. Ensure Local Server Controller (port 3030) is running.");
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      setError(err?.message || "Failed to stop server.");
    } finally {
      if (isMounted.current) {
        setActionInProgress(false);
      }
    }
  };

  const stateLabel =
    state === "RUNNING" ? "Running" : state === "STARTING" ? "Starting" : "Stopped";

  if (variant === "compact") {
    return (
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="server-control-compact"
      >
        {/* Server Status Badge */}
        <div
          data-testid="server-status-badge"
          className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
            state === "RUNNING" &&
              "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
            state === "STARTING" &&
              "bg-amber-500/15 text-amber-300 border-amber-500/30",
            state === "STOPPED" &&
              "bg-rose-500/15 text-rose-300 border-rose-500/30"
          )}
        >
          <span
            className={clsx(
              "w-2 h-2 rounded-full",
              state === "RUNNING" && "bg-emerald-400 shadow-[0_0_8px_#34d399]",
              state === "STARTING" && "bg-amber-400 animate-ping",
              state === "STOPPED" && "bg-rose-400"
            )}
          />
          <span>Server: {stateLabel}</span>
        </div>

        {/* Start Server (Server ON) Button — Always visible alongside Stop Server */}
        <button
          type="button"
          data-testid="start-server-btn"
          onClick={handleStartServer}
          disabled={state === "RUNNING" || state === "STARTING" || actionInProgress}
          title={
            state === "RUNNING"
              ? "Server is already Running on http://localhost:3000"
              : "Start RemindFlow AI Server (Server ON)"
          }
          className={clsx(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
            state === "STOPPED"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer"
              : "bg-slate-900/80 text-slate-500 border-slate-800 cursor-not-allowed opacity-60"
          )}
        >
          {state === "STARTING" ? (
            <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
          <span>{state === "STARTING" ? "Starting..." : "Start Server (ON)"}</span>
        </button>

        {/* Stop Server (Server OFF) Button */}
        <button
          type="button"
          data-testid="stop-server-btn"
          onClick={handleStopServer}
          disabled={state === "STOPPED" || state === "STARTING" || actionInProgress}
          title={
            state === "STOPPED"
              ? "Server is currently Stopped"
              : "Stop RemindFlow AI Server (Server OFF)"
          }
          className={clsx(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all",
            state === "RUNNING"
              ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 cursor-pointer"
              : "bg-slate-900/80 text-slate-500 border-slate-800 cursor-not-allowed opacity-60"
          )}
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Stop Server (OFF)</span>
        </button>

        {/* Working Link to http://localhost:3000 when running */}
        {state === "RUNNING" && (
          <a
            href={APP_URL}
            data-testid="open-app-link"
            className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 transition-colors"
            title="Open RemindFlow AI at http://localhost:3000"
          >
            <span>http://localhost:3000</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Inline Error or Status Feedback */}
        {error && (
          <span
            data-testid="server-error-msg"
            className="text-[11px] text-rose-400 font-semibold flex items-center gap-1 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30"
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[260px]" title={error}>
              {error}
            </span>
          </span>
        )}
      </div>
    );
  }

  // Full Card Variant (for Settings & Diagnostics Page)
  return (
    <div
      data-testid="server-control-card"
      className="bg-[#0B1120] p-6 sm:p-7 rounded-2xl border border-slate-800/80 space-y-5 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={clsx(
              "w-11 h-11 rounded-xl flex items-center justify-center border transition-colors",
              state === "RUNNING" &&
                "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
              state === "STARTING" &&
                "bg-amber-500/10 border-amber-500/30 text-amber-400",
              state === "STOPPED" &&
                "bg-rose-500/10 border-rose-500/30 text-rose-400"
            )}
          >
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Application Server Control (Server ON / Server OFF)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Start or stop the RemindFlow AI server on port 3000 with automatic readiness verification and duplicate process protection.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div
          data-testid="server-card-status"
          className={clsx(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wide border",
            state === "RUNNING" &&
              "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
            state === "STARTING" &&
              "bg-amber-500/15 text-amber-300 border-amber-500/30",
            state === "STOPPED" &&
              "bg-rose-500/15 text-rose-300 border-rose-500/30"
          )}
        >
          <span
            className={clsx(
              "w-2.5 h-2.5 rounded-full",
              state === "RUNNING" && "bg-emerald-400 shadow-[0_0_10px_#34d399]",
              state === "STARTING" && "bg-amber-400 animate-ping",
              state === "STOPPED" && "bg-rose-400"
            )}
          />
          <span>Status: {stateLabel}</span>
        </div>
      </div>

      {/* Diagnostics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/90 p-4 rounded-xl border border-slate-800/90 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 block">Application URL:</span>
          {state === "RUNNING" ? (
            <a
              href={APP_URL}
              target="_blank"
              rel="noreferrer"
              data-testid="card-open-app-link"
              className="font-mono font-bold text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
            >
              {APP_URL} <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="font-mono text-slate-500">{APP_URL} (Offline)</span>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 block">Server State & PID:</span>
          <span className="font-mono font-bold text-slate-200">
            {stateLabel} {pid ? `(PID: ${pid})` : ""}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 block">Always-On Control Panel:</span>
          <a
            href={CONTROLLER_URL}
            target="_blank"
            rel="noreferrer"
            className="font-mono font-semibold text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-1"
          >
            {CONTROLLER_URL} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          data-testid="card-start-server-btn"
          onClick={handleStartServer}
          disabled={state === "RUNNING" || state === "STARTING" || actionInProgress}
          className={clsx(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
            state === "STOPPED"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/40 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.5)] cursor-pointer"
              : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60"
          )}
        >
          {state === "STARTING" ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>
            {state === "STARTING" ? "Starting Server..." : "Start Server (Server ON)"}
          </span>
        </button>

        <button
          type="button"
          data-testid="card-stop-server-btn"
          onClick={handleStopServer}
          disabled={state === "STOPPED" || state === "STARTING" || actionInProgress}
          className={clsx(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all border",
            state === "RUNNING"
              ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border-rose-500/40 cursor-pointer"
              : "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-60"
          )}
        >
          <Square className="w-4 h-4 fill-current" />
          <span>Stop Server (Server OFF)</span>
        </button>

        {state === "RUNNING" && (
          <a
            href={APP_URL}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all"
          >
            <Server className="w-4 h-4" />
            <span>Open Application ({APP_URL})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        <button
          type="button"
          onClick={checkServerStatus}
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Status / Error Notifications */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div
          data-testid="card-server-error"
          className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 font-semibold flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{error}</p>
            <p className="text-[11px] text-rose-300/80 font-normal">
              Tip: You can always start the server from Windows by double-clicking{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-200 font-mono">
                start-remindflow.bat
              </code>{" "}
              or opening{" "}
              <a href={CONTROLLER_URL} target="_blank" rel="noreferrer" className="underline">
                {CONTROLLER_URL}
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Quick CLI / Launcher Reference */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Windows Launchers:{" "}
            <code className="text-slate-300 font-mono">start-remindflow.bat</code> (Server ON) •{" "}
            <code className="text-slate-300 font-mono">stop-remindflow.bat</code> (Server OFF) •{" "}
            <code className="text-slate-300 font-mono">server-control.bat</code> (Control Panel)
          </span>
        </span>
        <span>
          Controller:{" "}
          <strong className={controllerOnline ? "text-emerald-400" : "text-amber-400"}>
            {controllerOnline ? "Online (Port 3030)" : "Standby"}
          </strong>
        </span>
      </div>
    </div>
  );
}
