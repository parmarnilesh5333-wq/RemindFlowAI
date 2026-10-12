import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { SchedulerService } from "@/lib/scheduler-service";
import { getWallClockInTimezone, addCalendarDaysInTimezone, toTimezoneIso } from "@/lib/date-utils";
import { parseWithBuiltInEngine } from "@/lib/ai-reminder-engine";

const projectRoot = process.cwd();

describe("$0/Month Cloud Deployment, Scheduler Reliability & Safe Migration", () => {
  it("resolves Asia/Kolkata dates accurately even when the cloud host clock is in the previous UTC day", () => {
    // 2026-10-11T20:00:00.000Z is Oct 11 20:00 in UTC, but Oct 12 01:30 AM in Asia/Kolkata (IST, UTC+5:30)
    const utcLateNight = new Date("2026-10-11T20:00:00.000Z");

    const istWallClock = getWallClockInTimezone(utcLateNight, "Asia/Kolkata");
    expect(istWallClock.year).toBe(2026);
    expect(istWallClock.month).toBe(10);
    expect(istWallClock.day).toBe(12); // Oct 12 in India!

    const todayInIst = addCalendarDaysInTimezone(utcLateNight, 0, "Asia/Kolkata");
    const tomorrowInIst = addCalendarDaysInTimezone(utcLateNight, 1, "Asia/Kolkata");
    expect(todayInIst).toBe("2026-10-12");
    expect(tomorrowInIst).toBe("2026-10-13");

    // Verify AI parser schedules "today at 10 AM" for 2026-10-12 10:00 IST (04:30 UTC)
    const parsed = parseWithBuiltInEngine(
      "Send a fee reminder to Class 10 CBSE Maths today at 10 AM",
      [{ id: "g1", name: "Class 10 CBSE Maths" }],
      "Asia/Kolkata",
      utcLateNight,
      "English"
    );
    expect(parsed.scheduledDate).toBe("2026-10-12");
    expect(parsed.scheduledTime).toBe("10:00");
    expect(parsed.scheduledIsoString).toBe(toTimezoneIso("2026-10-12", "10:00", "Asia/Kolkata"));
    expect(parsed.scheduledIsoString).toBe("2026-10-12T04:30:00.000Z");
  });

  it("recovers stuck PROCESSING campaigns, catches up missed runs, and enforces recipient-level idempotency (zero duplicate sends)", async () => {
    const user = await prisma.user.findFirst();
    expect(user).not.toBeNull();

    // Create a temporary test group and 2 consenting contacts
    const suffix = Date.now().toString();
    const group = await prisma.group.create({
      data: {
        userId: user!.id,
        name: `Cloud Reliability Test Group ${suffix}`,
        description: "Temporary group for scheduler recovery test",
      },
    });

    const contact1 = await prisma.contact.create({
      data: {
        userId: user!.id,
        name: "Test Contact Already Sent",
        phone: `+91999901${suffix.slice(-4)}`,
        consentStatus: "GRANTED",
        optOutStatus: false,
      },
    });

    const contact2 = await prisma.contact.create({
      data: {
        userId: user!.id,
        name: "Test Contact Pending",
        phone: `+91999902${suffix.slice(-4)}`,
        consentStatus: "GRANTED",
        optOutStatus: false,
      },
    });

    await prisma.groupMembership.createMany({
      data: [
        { groupId: group.id, contactId: contact1.id },
        { groupId: group.id, contactId: contact2.id },
      ],
    });

    // Create a campaign that was scheduled 20 minutes ago and got stuck in PROCESSING 10 minutes ago
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    const stuckCampaign = await prisma.campaign.create({
      data: {
        userId: user!.id,
        name: `Stuck & Missed Cloud Campaign ${suffix}`,
        targetGroupId: group.id,
        status: "PROCESSING",
        messageContent: "Hello {{name}}, cloud recovery verification reminder.",
        scheduledAt: twentyMinsAgo,
        startedAt: tenMinsAgo,
        totalRecipients: 2,
      },
    });

    // Simulate that contact1 was ALREADY sent before the container slept/timed out
    await prisma.campaignRecipient.create({
      data: {
        campaignId: stuckCampaign.id,
        contactId: contact1.id,
        phoneSnapshot: contact1.phone,
        nameSnapshot: contact1.name,
        personalizedMessage: "Hello Test Contact Already Sent, cloud recovery verification reminder.",
        status: "SENT",
        providerMessageId: "wamid.SIMULATED_PRIOR_SEND",
        sentAt: tenMinsAgo,
      },
    });

    try {
      // Run scheduler tick
      const runResult = await SchedulerService.processDueCampaigns();

      // 1. Stuck campaign was recovered from PROCESSING
      expect(runResult.recoveredStuckCampaigns).toContain(stuckCampaign.id);

      // 2. Missed run was detected and completed
      expect(runResult.missedRunRecoveredCampaigns).toContain(stuckCampaign.id);
      expect(runResult.completedCampaigns).toContain(stuckCampaign.id);

      // 3. Verify recipient idempotency: contact1 was NOT sent a second messageLog entry
      const contact1Logs = await prisma.messageLog.findMany({
        where: {
          campaignId: stuckCampaign.id,
          phone: contact1.phone,
        },
      });
      expect(contact1Logs.length).toBe(0); // Skipped re-sending because already SENT!

      // 4. Verify contact2 WAS sent during the recovery run
      const contact2Logs = await prisma.messageLog.findMany({
        where: {
          campaignId: stuckCampaign.id,
          phone: contact2.phone,
          status: "SENT",
        },
      });
      expect(contact2Logs.length).toBe(1);

      const updatedCampaign = await prisma.campaign.findUnique({
        where: { id: stuckCampaign.id },
      });
      expect(updatedCampaign?.status).toBe("COMPLETED");
      expect(updatedCampaign?.successfulCount).toBe(2);
    } finally {
      // Clean up ONLY the temporary test records created in this test
      await prisma.messageLog.deleteMany({ where: { campaignId: stuckCampaign.id } });
      await prisma.campaignRecipient.deleteMany({ where: { campaignId: stuckCampaign.id } });
      await prisma.scheduledJob.deleteMany({ where: { campaignId: stuckCampaign.id } });
      await prisma.auditLog.deleteMany({ where: { entityId: stuckCampaign.id } });
      await prisma.campaign.delete({ where: { id: stuckCampaign.id } });
      await prisma.groupMembership.deleteMany({ where: { groupId: group.id } });
      await prisma.contact.deleteMany({ where: { id: { in: [contact1.id, contact2.id] } } });
      await prisma.group.delete({ where: { id: group.id } });
    }
  });

  it("verifies strictly $0/month cloud manifests (no paid plans or paid persistent disks) and PostgreSQL schema parity", () => {
    const renderYaml = fs.readFileSync(path.join(projectRoot, "render.yaml"), "utf-8");
    expect(renderYaml).toContain("plan: free");
    expect(renderYaml).not.toContain("plan: starter");
    expect(renderYaml).not.toContain("sizeGB:");

    const vercelJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf-8")
    );
    expect(vercelJson.buildCommand).toBe("npm run build:cloud");
    expect(Array.isArray(vercelJson.crons)).toBe(true);

    const ghWorkflowPath = path.join(
      projectRoot,
      ".github",
      "workflows",
      "remindflow-scheduler.yml"
    );
    expect(fs.existsSync(ghWorkflowPath)).toBe(true);
    const ghWorkflow = fs.readFileSync(ghWorkflowPath, "utf-8");
    expect(ghWorkflow).toContain("*/5 * * * *");
    expect(ghWorkflow).toContain("/api/scheduler/tick");

    const pgSchemaPath = path.join(projectRoot, "prisma", "schema.postgres.prisma");
    expect(fs.existsSync(pgSchemaPath)).toBe(true);
    const pgSchema = fs.readFileSync(pgSchemaPath, "utf-8");
    expect(pgSchema).toContain('provider = "postgresql"');
    expect(pgSchema).toContain("model Campaign");
    expect(pgSchema).toContain("model ScheduledJob");
  });
});
