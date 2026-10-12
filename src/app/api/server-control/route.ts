import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

const CONTROL_PORT = Number(process.env.CONTROL_PORT || 3030);
const CONTROL_BASE_URL = `http://127.0.0.1:${CONTROL_PORT}`;

async function isControllerListening(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${CONTROL_BASE_URL}/status`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureControllerRunning(): Promise<boolean> {
  if (await isControllerListening()) {
    return true;
  }

  try {
    const scriptPath = path.join(process.cwd(), "scripts", "server-controller.mjs");
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();

    // Wait briefly for the controller to bind port 3030
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await isControllerListening()) {
        return true;
      }
    }
  } catch {
    // Ignore spawn errors in restricted environments
  }

  return isControllerListening();
}

export async function GET() {
  const controllerActive = await ensureControllerRunning();

  if (controllerActive) {
    try {
      const res = await fetch(`${CONTROL_BASE_URL}/status`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          ...data,
          state: "RUNNING",
          running: true,
          starting: false,
          controllerActive: true,
        });
      }
    } catch {
      // Fallback below
    }
  }

  return NextResponse.json({
    state: "RUNNING",
    running: true,
    starting: false,
    url: "http://localhost:3000",
    dashboardUrl: "http://localhost:3000/dashboard",
    controlUrl: `http://localhost:${CONTROL_PORT}`,
    controllerActive,
    error: null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = (body?.action || "").toLowerCase();

    if (action !== "start" && action !== "stop") {
      return NextResponse.json(
        { error: "Invalid action. Expected 'start' or 'stop'." },
        { status: 400 }
      );
    }

    const controllerActive = await ensureControllerRunning();
    if (!controllerActive) {
      return NextResponse.json(
        {
          error:
            "Local Server Controller (port 3030) is not reachable. Run start-remindflow.bat or server-control.bat to manage the server.",
        },
        { status: 503 }
      );
    }

    const endpoint = action === "start" ? "/start" : "/stop";
    const res = await fetch(`${CONTROL_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : 500 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server control action failed." },
      { status: 500 }
    );
  }
}
