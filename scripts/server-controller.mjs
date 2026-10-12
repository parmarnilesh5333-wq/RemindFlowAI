/**
 * RemindFlow AI — Local Server Controller & Supervisor Service
 * Runs on http://localhost:3030 to provide reliable browser & CLI Start/Stop
 * controls for the RemindFlow AI application server (http://localhost:3000).
 */
import http from "http";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const APP_PORT = Number(process.env.PORT || 3000);
const CONTROL_PORT = Number(process.env.CONTROL_PORT || 3030);
const APP_URL = `http://localhost:${APP_PORT}`;
const LOG_FILE = path.join(PROJECT_ROOT, "remindflow-server.log");
const ERR_LOG_FILE = path.join(PROJECT_ROOT, "remindflow-server.err.log");

let currentState = "STOPPED"; // "RUNNING" | "STOPPED" | "STARTING"
let lastError = null;
let managedChild = null;
let startPromise = null;

/**
 * Check if http://127.0.0.1:3000/api/health (or /) responds with HTTP 200
 */
export function checkAppServerReady(port = APP_PORT, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/health",
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Find the Windows PID listening on the target TCP port
 */
export function getListeningPidOnPort(port = APP_PORT) {
  try {
    if (process.platform === "win32") {
      const output = execSync("netstat -ano -p tcp", {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const lines = output.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("TCP")) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 5) continue;
        const localAddr = parts[1];
        const state = parts[3];
        const pid = Number(parts[4]);
        if (
          state === "LISTENING" &&
          (localAddr.endsWith(`:${port}`) || localAddr === `0.0.0.0:${port}` || localAddr === `127.0.0.1:${port}`) &&
          pid > 0
        ) {
          return pid;
        }
      }
    } else {
      const output = execSync(`lsof -t -i:${port}`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (output) return Number(output.split(/\s+/)[0]);
    }
  } catch {
    // Ignore errors when no process is listening
  }
  return null;
}

/**
 * Synchronize live status with actual port/HTTP state
 */
export async function getLiveStatus() {
  if (currentState === "STARTING") {
    const ready = await checkAppServerReady();
    if (ready) {
      currentState = "RUNNING";
      lastError = null;
    }
    return {
      state: currentState,
      running: currentState === "RUNNING",
      starting: currentState === "STARTING",
      url: APP_URL,
      dashboardUrl: `${APP_URL}/dashboard`,
      controlUrl: `http://localhost:${CONTROL_PORT}`,
      pid: getListeningPidOnPort(APP_PORT),
      error: lastError,
    };
  }

  const ready = await checkAppServerReady();
  currentState = ready ? "RUNNING" : "STOPPED";
  return {
    state: currentState,
    running: ready,
    starting: false,
    url: APP_URL,
    dashboardUrl: `${APP_URL}/dashboard`,
    controlUrl: `http://localhost:${CONTROL_PORT}`,
    pid: ready ? getListeningPidOnPort(APP_PORT) : null,
    error: ready ? null : lastError,
  };
}

/**
 * Start the RemindFlow AI server on port 3000 safely without duplicates
 */
export async function startAppServer() {
  // 1. Prevent duplicate startups if already starting
  if (startPromise) {
    return startPromise;
  }

  // 2. If already running and healthy, do not start another instance
  const alreadyReady = await checkAppServerReady();
  if (alreadyReady) {
    currentState = "RUNNING";
    lastError = null;
    return {
      ok: true,
      alreadyRunning: true,
       ...(await getLiveStatus()),
    };
  }

  startPromise = (async () => {
    try {
      currentState = "STARTING";
      lastError = null;

      // Reclaim port 3000 if a stale unresponsive process is holding it
      const stalePid = getListeningPidOnPort(APP_PORT);
      if (stalePid && stalePid !== process.pid) {
        try {
          if (process.platform === "win32") {
            execSync(`taskkill /PID ${stalePid} /T /F`, { stdio: "ignore" });
          } else {
            process.kill(stalePid, "SIGKILL");
          }
        } catch {}
      }

      const hasProdBuild = fs.existsSync(path.join(PROJECT_ROOT, ".next", "BUILD_ID"));
      const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
      const args = hasProdBuild
        ? ["run", "start", "--", "-H", "0.0.0.0", "-p", String(APP_PORT)]
        : ["run", "dev", "--", "-H", "0.0.0.0", "-p", String(APP_PORT)];

      const outStream = fs.openSync(LOG_FILE, "a");
      const errStream = fs.openSync(ERR_LOG_FILE, "a");

      managedChild = spawn(npmCmd, args, {
        cwd: PROJECT_ROOT,
        stdio: ["ignore", outStream, errStream],
        detached: false,
        shell: process.platform === "win32",
      });

      let earlyExitCode = null;
      managedChild.on("exit", (code) => {
        earlyExitCode = code;
        if (currentState !== "STARTING") {
          currentState = "STOPPED";
        }
      });

      // Poll until server is ready (up to 30 seconds)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (await checkAppServerReady()) {
          currentState = "RUNNING";
          lastError = null;
          return {
            ok: true,
            alreadyRunning: false,
            ...(await getLiveStatus()),
          };
        }
        if (earlyExitCode !== null && earlyExitCode !== 0) {
          break;
        }
      }

      // Startup failed
      currentState = "STOPPED";
      let errTail = "";
      try {
        if (fs.existsSync(ERR_LOG_FILE)) {
          const content = fs.readFileSync(ERR_LOG_FILE, "utf-8").trim();
          errTail = content.split(/\r?\n/).slice(-5).join(" | ");
        }
      } catch {}
      lastError = errTail
        ? `Server failed to start on port ${APP_PORT}: ${errTail}`
        : `Server did not become ready on ${APP_URL} within 30 seconds.`;

      return {
        ok: false,
        ...(await getLiveStatus()),
      };
    } catch (err) {
      currentState = "STOPPED";
      lastError = err?.message || "Unexpected error while starting server.";
      return {
        ok: false,
        ...(await getLiveStatus()),
      };
    } finally {
      startPromise = null;
    }
  })();

  return startPromise;
}

/**
 * Stop the RemindFlow AI server on port 3000 cleanly
 */
export async function stopAppServer() {
  lastError = null;

  // Kill managed child if present
  if (managedChild && managedChild.pid) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${managedChild.pid} /T /F`, { stdio: "ignore" });
      } else {
        managedChild.kill("SIGTERM");
      }
    } catch {}
    managedChild = null;
  }

  // Also check any process listening on APP_PORT (3000)
  const listeningPid = getListeningPidOnPort(APP_PORT);
  if (listeningPid && listeningPid !== process.pid) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${listeningPid} /F`, { stdio: "ignore" });
      } else {
        process.kill(listeningPid, "SIGKILL");
      }
    } catch {}
  }

  // Wait up to 4 seconds for port 3000 to stop responding
  for (let i = 0; i < 10; i++) {
    const stillUp = await checkAppServerReady(APP_PORT, 500);
    if (!stillUp) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  currentState = "STOPPED";
  return {
    ok: true,
    ...(await getLiveStatus()),
  };
}

function renderControlCenterHtml() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RemindFlow AI — Server Control Center</title>
  <style>
    :root {
      color-scheme: dark;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      min-height: 100vh;
      background: radial-gradient(ellipse 75% 50% at 50% -10%, rgba(37, 99, 235, 0.2), rgba(99, 102, 241, 0.08) 45%, transparent 75%), #050811;
      color: #f8fafc;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .panel {
      width: 100%;
      max-width: 540px;
      background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(9, 13, 26, 0.96));
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 32px 64px -16px rgba(2, 6, 23, 0.85);
    }
    .brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-title span {
      color: #60a5fa;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    .status-running {
      background: rgba(16, 185, 129, 0.12);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-stopped {
      background: rgba(244, 63, 94, 0.12);
      color: #fda4af;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .status-starting {
      background: rgba(245, 158, 11, 0.14);
      color: #fcd34d;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    p.sub {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .info-box {
      background: #060913;
      border: 1px solid rgba(148, 163, 184, 0.14);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }
    .info-label {
      color: #94a3b8;
    }
    .info-val {
      font-family: monospace;
      color: #e2e8f0;
      font-weight: 600;
    }
    .controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    button {
      padding: 14px 18px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn-start {
      background: linear-gradient(90deg, #2563eb, #4f46e5, #7c3aed);
      color: #fff;
      box-shadow: 0 8px 24px -6px rgba(37, 99, 235, 0.55);
    }
    .btn-start:hover:not(:disabled) {
      filter: brightness(1.1);
    }
    .btn-stop {
      background: rgba(244, 63, 94, 0.14);
      color: #fda4af;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .btn-stop:hover:not(:disabled) {
      background: rgba(244, 63, 94, 0.24);
      color: #fff;
    }
    .open-links {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .open-link {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 13px 18px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      background: rgba(16, 185, 129, 0.14);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.3);
      transition: all 0.2s ease;
    }
    .open-link:hover {
      background: rgba(16, 185, 129, 0.22);
      color: #fff;
    }
    .open-link.disabled {
      pointer-events: none;
      opacity: 0.35;
      background: rgba(30, 41, 59, 0.5);
      color: #64748b;
      border-color: rgba(51, 65, 85, 0.5);
    }
    .error-box {
      display: none;
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: 12px;
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.35);
      color: #fecdd3;
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="panel">
    <div class="brand">
      <div class="brand-title">RemindFlow <span>AI</span> Control</div>
      <div id="badge" class="status-badge status-stopped">
        <span class="dot"></span>
        <span id="badge-text">Checking...</span>
      </div>
    </div>

    <h1>Application Server Manager</h1>
    <p class="sub">
      Start or stop the RemindFlow AI web server at any time. Even when the main server on port 3000 is stopped, this control panel stays active so you can turn it back on with one click.
    </p>

    <div id="error-box" class="error-box"></div>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Server State</span>
        <span id="state-text" class="info-val">Checking...</span>
      </div>
      <div class="info-row">
        <span class="info-label">Application URL</span>
        <span class="info-val">http://localhost:3000</span>
      </div>
      <div class="info-row">
        <span class="info-label">Process ID (PID)</span>
        <span id="pid-text" class="info-val">—</span>
      </div>
    </div>

    <div class="controls">
      <button id="btn-start" class="btn-start" onclick="triggerAction('start')">
        ▶ Server ON (Start Server)
      </button>
      <button id="btn-stop" class="btn-stop" onclick="triggerAction('stop')">
        ■ Server OFF (Stop Server)
      </button>
    </div>

    <div class="open-links">
      <a id="open-app" href="http://localhost:3000" target="_blank" rel="noopener" class="open-link disabled">
        Open RemindFlow AI (http://localhost:3000) ↗
      </a>
    </div>
  </div>

  <script>
    async function refreshStatus() {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        updateUI(data);
      } catch (e) {
        // ignore transient error
      }
    }

    function updateUI(data) {
      const badge = document.getElementById('badge');
      const badgeText = document.getElementById('badge-text');
      const stateText = document.getElementById('state-text');
      const pidText = document.getElementById('pid-text');
      const btnStart = document.getElementById('btn-start');
      const btnStop = document.getElementById('btn-stop');
      const openApp = document.getElementById('open-app');
      const errBox = document.getElementById('error-box');

      if (data.error) {
        errBox.style.display = 'block';
        errBox.textContent = data.error;
      } else {
        errBox.style.display = 'none';
      }

      if (data.state === 'RUNNING') {
        badge.className = 'status-badge status-running';
        badgeText.textContent = 'Running';
        stateText.textContent = 'Running (Ready on Port 3000)';
        pidText.textContent = data.pid ? String(data.pid) : 'Active';
        btnStart.disabled = true;
        btnStop.disabled = false;
        openApp.classList.remove('disabled');
      } else if (data.state === 'STARTING') {
        badge.className = 'status-badge status-starting';
        badgeText.textContent = 'Starting...';
        stateText.textContent = 'Starting server & verifying readiness...';
        pidText.textContent = 'Launching...';
        btnStart.disabled = true;
        btnStop.disabled = true;
        openApp.classList.add('disabled');
      } else {
        badge.className = 'status-badge status-stopped';
        badgeText.textContent = 'Stopped';
        stateText.textContent = 'Stopped (Port 3000 Offline)';
        pidText.textContent = '—';
        btnStart.disabled = false;
        btnStop.disabled = true;
        openApp.classList.add('disabled');
      }
    }

    async function triggerAction(action) {
      if (action === 'start') {
        updateUI({ state: 'STARTING' });
      }
      try {
        const res = await fetch('/' + action, { method: 'POST' });
        const data = await res.json();
        updateUI(data);
      } catch (err) {
        updateUI({ state: 'STOPPED', error: 'Failed to communicate with local controller.' });
      }
    }

    refreshStatus();
    setInterval(refreshStatus, 2500);
  </script>
</body>
</html>`;
}

/**
 * Start the HTTP control server on port 3030 if executed directly
 */
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(__filename).toLowerCase();

if (isMain) {
  const autoStartApp = process.argv.includes("--autostart");

  const server = http.createServer(async (req, res) => {
    // Enable CORS so http://localhost:3000 can call http://localhost:3030 directly
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://localhost:${CONTROL_PORT}`);

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderControlCenterHtml());
      return;
    }

    if (req.method === "GET" && url.pathname === "/status") {
      const status = await getLiveStatus();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    if (req.method === "POST" && url.pathname === "/start") {
      const result = await startAppServer();
      res.writeHead(result.ok ? 200 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url.pathname === "/stop") {
      const result = await stopAppServer();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[Controller] Port ${CONTROL_PORT} is already active.`);
      process.exit(0);
    } else {
      console.error("[Controller] Error:", err);
      process.exit(1);
    }
  });

  server.listen(CONTROL_PORT, "127.0.0.1", async () => {
    console.log(`[Controller] RemindFlow AI Server Control listening on http://localhost:${CONTROL_PORT}`);
    if (autoStartApp) {
      await startAppServer();
    } else {
      await getLiveStatus();
    }
  });
}
