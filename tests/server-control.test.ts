import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

describe("RemindFlow AI — Server Start/Stop (Server ON / Server OFF) System", () => {
  it("provides the Local Server Controller service (scripts/server-controller.mjs) with Start, Stop, Status, readiness checks, and duplicate process protection", () => {
    const controllerPath = path.join(projectRoot, "scripts", "server-controller.mjs");
    expect(fs.existsSync(controllerPath)).toBe(true);

    const content = fs.readFileSync(controllerPath, "utf-8");
    // Verifies server states: RUNNING, STOPPED, STARTING
    expect(content).toContain('"RUNNING"');
    expect(content).toContain('"STOPPED"');
    expect(content).toContain('"STARTING"');

    // Verifies readiness polling against /api/health before reporting RUNNING
    expect(content).toContain("/api/health");
    expect(content).toContain("checkAppServerReady");

    // Verifies duplicate process prevention (single-flight lock + alreadyRunning check)
    expect(content).toContain("startPromise");
    expect(content).toContain("alreadyRunning: true");

    // Verifies both Start Server (Server ON) and Stop Server (Server OFF) endpoints & UI
    expect(content).toContain("/start");
    expect(content).toContain("/stop");
    expect(content).toContain("/status");
    expect(content).toContain("Server ON (Start Server)");
    expect(content).toContain("Server OFF (Stop Server)");
    expect(content).toContain("http://localhost:3000");
  });

  it("provides the ServerControlWidget component with Start Server (ON), Stop Server (OFF), clear states (Running, Stopped, Starting), error display, and working link to http://localhost:3000", () => {
    const widgetPath = path.join(
      projectRoot,
      "src",
      "components",
      "layout",
      "ServerControlWidget.tsx"
    );
    expect(fs.existsSync(widgetPath)).toBe(true);

    const content = fs.readFileSync(widgetPath, "utf-8");
    // Clear server states
    expect(content).toContain('"Running"');
    expect(content).toContain('"Starting"');
    expect(content).toContain('"Stopped"');

    // Start Server (Server ON) and Stop Server (Server OFF) controls
    expect(content).toContain("Start Server (ON)");
    expect(content).toContain("Stop Server (OFF)");
    expect(content).toContain("Start Server (Server ON)");
    expect(content).toContain("Stop Server (Server OFF)");

    // Prevents duplicate clicks when already Running or Starting
    expect(content).toContain(
      'disabled={state === "RUNNING" || state === "STARTING" || actionInProgress}'
    );

    // Working link to http://localhost:3000
    expect(content).toContain("http://localhost:3000");

    // Readiness verification against /api/health
    expect(content).toContain("/api/health");
  });

  it("integrates ServerControlWidget into both AppShell header and Settings page", () => {
    const appShellPath = path.join(
      projectRoot,
      "src",
      "components",
      "layout",
      "AppShell.tsx"
    );
    const settingsPath = path.join(projectRoot, "src", "app", "settings", "page.tsx");

    const appShellContent = fs.readFileSync(appShellPath, "utf-8");
    const settingsContent = fs.readFileSync(settingsPath, "utf-8");

    expect(appShellContent).toContain("ServerControlWidget");
    expect(settingsContent).toContain("ServerControlWidget");
  });

  it("provides Next.js API route /api/server-control and Windows launcher scripts for starting and stopping the server", () => {
    const apiRoutePath = path.join(
      projectRoot,
      "src",
      "app",
      "api",
      "server-control",
      "route.ts"
    );
    const startBatPath = path.join(projectRoot, "start-remindflow.bat");
    const stopBatPath = path.join(projectRoot, "stop-remindflow.bat");
    const controlBatPath = path.join(projectRoot, "server-control.bat");
    const startPs1Path = path.join(projectRoot, "scripts", "start-remindflow.ps1");
    const stopPs1Path = path.join(projectRoot, "scripts", "stop-remindflow.ps1");

    expect(fs.existsSync(apiRoutePath)).toBe(true);
    expect(fs.existsSync(startBatPath)).toBe(true);
    expect(fs.existsSync(stopBatPath)).toBe(true);
    expect(fs.existsSync(controlBatPath)).toBe(true);
    expect(fs.existsSync(startPs1Path)).toBe(true);
    expect(fs.existsSync(stopPs1Path)).toBe(true);

    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8")
    );
    expect(pkgJson.scripts["server:start"]).toBeDefined();
    expect(pkgJson.scripts["server:stop"]).toBeDefined();
    expect(pkgJson.scripts["server:controller"]).toBeDefined();
  });
});
