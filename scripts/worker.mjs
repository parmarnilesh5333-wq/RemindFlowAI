import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET || "";

console.log("RemindFlow AI Background Scheduler Worker started.");
console.log(`Checking for due scheduled campaigns every 15 seconds (Target: ${APP_URL})...`);

async function tick() {
  try {
    const now = new Date();
    const dueCount = await prisma.campaign.count({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: now },
      },
    });

    if (dueCount > 0) {
      console.log(`[${now.toISOString()}] Found ${dueCount} due campaign(s). Triggering /api/scheduler/tick...`);
      const headers = { "Content-Type": "application/json" };
      if (CRON_SECRET) {
        headers["Authorization"] = `Bearer ${CRON_SECRET}`;
      }
      const res = await fetch(`${APP_URL}/api/scheduler/tick`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`[${now.toISOString()}] Scheduler processed ${data.result?.processedCount ?? 0} campaign(s).`);
      } else {
        console.warn(`[${now.toISOString()}] Scheduler tick returned HTTP ${res.status}`);
      }
    }
  } catch (err) {
    console.error("Worker tick error:", err.message);
  }
}

// Initial run
tick();

// Run every 15 seconds
setInterval(tick, 15000);
