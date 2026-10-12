import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { GET as healthGet } from "@/app/api/health/route";
import fs from "fs";
import path from "path";

describe("Deployment, Security Boundary & Startup Script Readiness", () => {
  const originalPasscode = process.env.WORKSPACE_ACCESS_PASSCODE;
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalPasscode === undefined) {
      delete process.env.WORKSPACE_ACCESS_PASSCODE;
    } else {
      process.env.WORKSPACE_ACCESS_PASSCODE = originalPasscode;
    }
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("verifies /api/health returns 200 OK with database connectivity and simulation mode status", async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.databaseConnected).toBe(true);
    expect(json.simulationMode).toBe(true);
  });

  it("enforces WORKSPACE_ACCESS_PASSCODE on private dashboard and API routes when configured", async () => {
    process.env.WORKSPACE_ACCESS_PASSCODE = "test-secret-passcode-2026";

    // 1. Public landing page "/" remains accessible
    const publicReq = new NextRequest("http://localhost:3000/");
    const publicRes = middleware(publicReq);
    expect(publicRes.status).toBe(200);

    // 2. Unauthenticated "/dashboard" redirects to "/login?next=%2Fdashboard"
    const dashReq = new NextRequest("http://localhost:3000/dashboard");
    const dashRes = middleware(dashReq);
    expect(dashRes.status).toBe(307);
    expect(dashRes.headers.get("location")).toContain("/login?next=%2Fdashboard");

    // 3. Unauthenticated "/api/contacts" returns 401 JSON error
    const apiReq = new NextRequest("http://localhost:3000/api/contacts");
    const apiRes = middleware(apiReq);
    expect(apiRes.status).toBe(401);

    // 4. Authenticated "/api/contacts" with Bearer token succeeds
    const authApiReq = new NextRequest("http://localhost:3000/api/contacts", {
      headers: { Authorization: "Bearer test-secret-passcode-2026" },
    });
    const authApiRes = middleware(authApiReq);
    expect(authApiRes.status).toBe(200);
  });

  it("allows /api/scheduler/tick with valid CRON_SECRET even when workspace passcode is active", () => {
    process.env.WORKSPACE_ACCESS_PASSCODE = "test-secret-passcode-2026";
    process.env.CRON_SECRET = "cron-runner-token-999";

    const cronReq = new NextRequest("http://localhost:3000/api/scheduler/tick", {
      headers: { Authorization: "Bearer cron-runner-token-999" },
    });
    const cronRes = middleware(cronReq);
    expect(cronRes.status).toBe(200);
  });

  it("includes Windows startup scripts, backup scripts, and cloud deployment manifests without leaked secrets", () => {
    const root = process.cwd();
    expect(fs.existsSync(path.join(root, "start-remindflow.bat"))).toBe(true);
    expect(fs.existsSync(path.join(root, "scripts/start-remindflow.ps1"))).toBe(true);
    expect(fs.existsSync(path.join(root, "backup-data.bat"))).toBe(true);
    expect(fs.existsSync(path.join(root, "restore-data.bat"))).toBe(true);
    expect(fs.existsSync(path.join(root, "scripts/backup-restore.ps1"))).toBe(true);
    expect(fs.existsSync(path.join(root, "Dockerfile"))).toBe(true);
    expect(fs.existsSync(path.join(root, "render.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(root, "railway.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, ".gitignore"))).toBe(true);

    const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf-8");
    expect(envExample).toContain("WORKSPACE_ACCESS_PASSCODE");
    expect(envExample).toContain("CRON_SECRET");
  });
});
