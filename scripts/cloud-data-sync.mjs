/**
 * RemindFlow AI — Non-Destructive Database Export, Import & Cloud Migration Utility
 *
 * Usage:
 *   node scripts/cloud-data-sync.mjs export   -> Backs up prisma/dev.db and exports all records to backups/remindflow-data-export.json
 *   node scripts/cloud-data-sync.mjs import   -> Idempotently upserts records from backups/remindflow-data-export.json into DATABASE_URL
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(PROJECT_ROOT, "backups");
const DEFAULT_EXPORT_PATH = path.join(BACKUP_DIR, "remindflow-data-export.json");
const SQLITE_DB_PATH = path.join(PROJECT_ROOT, "prisma", "dev.db");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createSqliteSafetyBackup() {
  ensureBackupDir();
  if (fs.existsSync(SQLITE_DB_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(BACKUP_DIR, `remindflow-pre-migration-${stamp}.db`);
    fs.copyFileSync(SQLITE_DB_PATH, dest);
    console.log(`[Backup] Created SQLite safety backup: ${dest}`);
  }
}

export async function exportDatabaseToJson(targetFile = DEFAULT_EXPORT_PATH) {
  createSqliteSafetyBackup();
  const prisma = new PrismaClient();

  try {
    const [
      users,
      settings,
      groups,
      contacts,
      groupMemberships,
      consentRecords,
      optOuts,
      templates,
      campaigns,
      campaignRecipients,
      scheduledJobs,
      messageLogs,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.settings.findMany(),
      prisma.group.findMany(),
      prisma.contact.findMany(),
      prisma.groupMembership.findMany(),
      prisma.consentRecord.findMany(),
      prisma.optOut.findMany(),
      prisma.template.findMany(),
      prisma.campaign.findMany(),
      prisma.campaignRecipient.findMany(),
      prisma.scheduledJob.findMany(),
      prisma.messageLog.findMany(),
      prisma.auditLog.findMany(),
    ]);

    const snapshot = {
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      counts: {
        users: users.length,
        settings: settings.length,
        groups: groups.length,
        contacts: contacts.length,
        groupMemberships: groupMemberships.length,
        consentRecords: consentRecords.length,
        optOuts: optOuts.length,
        templates: templates.length,
        campaigns: campaigns.length,
        campaignRecipients: campaignRecipients.length,
        scheduledJobs: scheduledJobs.length,
        messageLogs: messageLogs.length,
        auditLogs: auditLogs.length,
      },
      data: {
        users,
        settings,
        groups,
        contacts,
        groupMemberships,
        consentRecords,
        optOuts,
        templates,
        campaigns,
        campaignRecipients,
        scheduledJobs,
        messageLogs,
        auditLogs,
      },
    };

    ensureBackupDir();
    fs.writeFileSync(targetFile, JSON.stringify(snapshot, null, 2), "utf-8");
    console.log(`[Export] Successfully exported all RemindFlow AI data to: ${targetFile}`);
    console.log(`[Export] Summary:`, snapshot.counts);
    return snapshot;
  } finally {
    await prisma.$disconnect();
  }
}

export async function importDatabaseFromJson(sourceFile = DEFAULT_EXPORT_PATH) {
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`Export snapshot file not found at: ${sourceFile}`);
  }

  const raw = fs.readFileSync(sourceFile, "utf-8");
  const snapshot = JSON.parse(raw);
  const d = snapshot.data || {};

  const prisma = new PrismaClient();
  try {
    console.log(`[Import] Restoring/migrating snapshot from ${snapshot.exportedAt} (non-destructive upsert)...`);

    // 1. Users
    for (const u of d.users || []) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {
          name: u.name,
          role: u.role,
          defaultLanguage: u.defaultLanguage,
          defaultTimezone: u.defaultTimezone,
        },
        create: {
          ...u,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

    // 2. Settings (preserve simulationMode = true)
    for (const s of d.settings || []) {
      await prisma.settings.upsert({
        where: { id: s.id },
        update: {
          defaultTimezone: s.defaultTimezone,
          defaultLanguage: s.defaultLanguage,
          simulationMode: true,
          autoConsentOnImport: s.autoConsentOnImport,
          optOutKeywords: s.optOutKeywords,
        },
        create: {
          ...s,
          simulationMode: true,
          updatedAt: new Date(s.updatedAt),
        },
      });
    }

    // 3. Groups
    for (const g of d.groups || []) {
      await prisma.group.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          description: g.description,
          color: g.color,
        },
        create: {
          ...g,
          createdAt: new Date(g.createdAt),
          updatedAt: new Date(g.updatedAt),
        },
      });
    }

    // 4. Contacts
    for (const c of d.contacts || []) {
      await prisma.contact.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          roleOrGrade: c.roleOrGrade,
          notes: c.notes,
          consentStatus: c.consentStatus,
          consentSource: c.consentSource,
          consentTimestamp: c.consentTimestamp ? new Date(c.consentTimestamp) : null,
          optOutStatus: c.optOutStatus,
          optOutReason: c.optOutReason,
          optOutAt: c.optOutAt ? new Date(c.optOutAt) : null,
          customAttributes: c.customAttributes,
        },
        create: {
          ...c,
          consentTimestamp: c.consentTimestamp ? new Date(c.consentTimestamp) : null,
          optOutAt: c.optOutAt ? new Date(c.optOutAt) : null,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        },
      });
    }

    // 5. GroupMemberships
    for (const gm of d.groupMemberships || []) {
      await prisma.groupMembership.upsert({
        where: { id: gm.id },
        update: {},
        create: {
          ...gm,
          createdAt: new Date(gm.createdAt),
        },
      });
    }

    // 6. ConsentRecords
    for (const cr of d.consentRecords || []) {
      await prisma.consentRecord.upsert({
        where: { id: cr.id },
        update: {},
        create: {
          ...cr,
          timestamp: new Date(cr.timestamp),
        },
      });
    }

    // 7. OptOuts
    for (const o of d.optOuts || []) {
      await prisma.optOut.upsert({
        where: { id: o.id },
        update: {
          reason: o.reason,
          source: o.source,
        },
        create: {
          ...o,
          timestamp: new Date(o.timestamp),
        },
      });
    }

    // 8. Templates
    for (const t of d.templates || []) {
      await prisma.template.upsert({
        where: { id: t.id },
        update: {
          content: t.content,
          variables: t.variables,
          status: t.status,
        },
        create: {
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        },
      });
    }

    // 9. Campaigns
    for (const camp of d.campaigns || []) {
      await prisma.campaign.upsert({
        where: { id: camp.id },
        update: {
          name: camp.name,
          objective: camp.objective,
          targetGroupId: camp.targetGroupId,
          status: camp.status,
          language: camp.language,
          originalPrompt: camp.originalPrompt,
          messageContent: camp.messageContent,
          variablesUsed: camp.variablesUsed,
          scheduledAt: camp.scheduledAt ? new Date(camp.scheduledAt) : null,
          startedAt: camp.startedAt ? new Date(camp.startedAt) : null,
          completedAt: camp.completedAt ? new Date(camp.completedAt) : null,
          totalRecipients: camp.totalRecipients,
          successfulCount: camp.successfulCount,
          failedCount: camp.failedCount,
          duplicateHash: camp.duplicateHash,
        },
        create: {
          ...camp,
          scheduledAt: camp.scheduledAt ? new Date(camp.scheduledAt) : null,
          startedAt: camp.startedAt ? new Date(camp.startedAt) : null,
          completedAt: camp.completedAt ? new Date(camp.completedAt) : null,
          createdAt: new Date(camp.createdAt),
          updatedAt: new Date(camp.updatedAt),
        },
      });
    }

    // 10. CampaignRecipients
    for (const r of d.campaignRecipients || []) {
      await prisma.campaignRecipient.upsert({
        where: { id: r.id },
        update: {
          status: r.status,
          providerMessageId: r.providerMessageId,
          errorMessage: r.errorMessage,
          errorCode: r.errorCode,
          sentAt: r.sentAt ? new Date(r.sentAt) : null,
          deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : null,
          readAt: r.readAt ? new Date(r.readAt) : null,
        },
        create: {
          ...r,
          sentAt: r.sentAt ? new Date(r.sentAt) : null,
          deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : null,
          readAt: r.readAt ? new Date(r.readAt) : null,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
        },
      });
    }

    // 11. ScheduledJobs
    for (const sj of d.scheduledJobs || []) {
      await prisma.scheduledJob.upsert({
        where: { id: sj.id },
        update: {
          status: sj.status,
          retryCount: sj.retryCount,
          lastError: sj.lastError,
          lockedAt: sj.lockedAt ? new Date(sj.lockedAt) : null,
          completedAt: sj.completedAt ? new Date(sj.completedAt) : null,
        },
        create: {
          ...sj,
          runAt: new Date(sj.runAt),
          lockedAt: sj.lockedAt ? new Date(sj.lockedAt) : null,
          completedAt: sj.completedAt ? new Date(sj.completedAt) : null,
          createdAt: new Date(sj.createdAt),
          updatedAt: new Date(sj.updatedAt),
        },
      });
    }

    // 12. MessageLogs
    for (const ml of d.messageLogs || []) {
      await prisma.messageLog.upsert({
        where: { id: ml.id },
        update: {},
        create: {
          ...ml,
          createdAt: new Date(ml.createdAt),
        },
      });
    }

    // 13. AuditLogs
    for (const al of d.auditLogs || []) {
      await prisma.auditLog.upsert({
        where: { id: al.id },
        update: {},
        create: {
          ...al,
          createdAt: new Date(al.createdAt),
        },
      });
    }

    console.log(`[Import] Successfully imported all records without data loss.`);
    return snapshot.counts;
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(__filename).toLowerCase();

if (isMain) {
  const action = (process.argv[2] || "export").toLowerCase();
  const customPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_EXPORT_PATH;

  if (action === "export") {
    exportDatabaseToJson(customPath).catch((err) => {
      console.error("[Export Error]:", err.message);
      process.exit(1);
    });
  } else if (action === "import") {
    importDatabaseFromJson(customPath).catch((err) => {
      console.error("[Import Error]:", err.message);
      process.exit(1);
    });
  } else {
    console.error("Usage: node scripts/cloud-data-sync.mjs [export|import] [optional-path]");
    process.exit(1);
  }
}
