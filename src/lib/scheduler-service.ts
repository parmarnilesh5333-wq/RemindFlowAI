import { prisma } from "./prisma";
import { renderPersonalizedMessage } from "./template";
import { WhatsAppCloudAdapter } from "./whatsapp-adapter";
import { recordAuditLog } from "./audit";

export interface SchedulerRunResult {
  processedCount: number;
  completedCampaigns: string[];
  failedCampaigns: string[];
  skippedCampaigns: string[];
  recoveredStuckCampaigns?: string[];
  missedRunRecoveredCampaigns?: string[];
  retriedJobsCount?: number;
}

/**
 * Stale lock threshold (5 minutes): if a serverless function or sleeping container
 * was interrupted while a campaign was in PROCESSING state, recover it safely.
 */
const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Missed-run threshold (2 minutes): if a campaign's scheduledAt was more than 2 minutes
 * ago (e.g. due to free-tier container spin-down or 5-minute cron interval), flag it
 * as a recovered missed run.
 */
const MISSED_RUN_THRESHOLD_MS = 2 * 60 * 1000;

export class SchedulerService {
  /**
   * Recovers any campaigns that were left in PROCESSING state for longer than
   * STALE_LOCK_THRESHOLD_MS due to container sleep, crash, or serverless timeout.
   * Recipient-level idempotency in dispatchCampaign ensures already-sent recipients
   * are never sent duplicate messages.
   */
  public static async recoverStuckCampaigns(now: Date = new Date()): Promise<string[]> {
    const staleCutoff = new Date(now.getTime() - STALE_LOCK_THRESHOLD_MS);

    const stuckCampaigns = await prisma.campaign.findMany({
      where: {
        status: "PROCESSING",
        OR: [
          { startedAt: { lte: staleCutoff } },
          { startedAt: null, updatedAt: { lte: staleCutoff } },
        ],
      },
      select: { id: true },
    });

    const recoveredIds: string[] = [];
    for (const stuck of stuckCampaigns) {
      const updated = await prisma.campaign.updateMany({
        where: {
          id: stuck.id,
          status: "PROCESSING",
        },
        data: {
          status: "SCHEDULED",
        },
      });
      if (updated.count > 0) {
        recoveredIds.push(stuck.id);
      }
    }

    return recoveredIds;
  }

  /**
   * Main scheduler tick:
   * 1. Recovers any stale PROCESSING locks from interrupted cloud runs.
   * 2. Scans for due SCHEDULED campaigns in chronological order (including missed runs).
   * 3. Atomically locks each campaign to prevent duplicate concurrent execution.
   * 4. Dispatches messages with recipient-level idempotency and consent/opt-out enforcement.
   * 5. Processes pending exponential-backoff retries.
   */
  public static async processDueCampaigns(nowOverride?: Date): Promise<SchedulerRunResult> {
    const now = nowOverride || new Date();
    const recoveredStuckCampaigns = await this.recoverStuckCampaigns(now);

    const result: SchedulerRunResult = {
      processedCount: 0,
      completedCampaigns: [],
      failedCampaigns: [],
      skippedCampaigns: [],
      recoveredStuckCampaigns,
      missedRunRecoveredCampaigns: [],
      retriedJobsCount: 0,
    };

    // 1. Find campaigns that are due for dispatch in chronological order (oldest missed run first)
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        targetGroup: {
          include: {
            memberships: {
              include: {
                contact: true,
              },
            },
          },
        },
        recipients: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 15, // Batch limit per tick
    });

    for (const campaign of dueCampaigns) {
      // Concurrency lock: update status to PROCESSING atomically
      const locked = await prisma.campaign.updateMany({
        where: {
          id: campaign.id,
          status: "SCHEDULED",
        },
        data: {
          status: "PROCESSING",
          startedAt: now,
        },
      });

      if (locked.count === 0) {
        // Another worker/cron invocation picked it up concurrently
        result.skippedCampaigns.push(campaign.id);
        continue;
      }

      result.processedCount++;

      const isMissedRun =
        campaign.scheduledAt != null &&
        now.getTime() - new Date(campaign.scheduledAt).getTime() > MISSED_RUN_THRESHOLD_MS;

      if (isMissedRun) {
        result.missedRunRecoveredCampaigns?.push(campaign.id);
      }

      // Mark corresponding ScheduledJob as RUNNING if present
      await prisma.scheduledJob.updateMany({
        where: {
          campaignId: campaign.id,
          status: "PENDING",
        },
        data: {
          status: "RUNNING",
          lockedAt: now,
        },
      });

      try {
        await this.dispatchCampaign(campaign.id, { isMissedRun, referenceNow: now });
        result.completedCampaigns.push(campaign.id);

        await prisma.scheduledJob.updateMany({
          where: {
            campaignId: campaign.id,
            status: { in: ["PENDING", "RUNNING", "FAILED"] },
          },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            lastError: null,
          },
        });
      } catch (err: any) {
        console.error(`Error processing campaign ${campaign.id}:`, err);
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: "FAILED",
          },
        });

        // Ensure a ScheduledJob exists in FAILED state so exponential-backoff retry can recover it
        const existingJob = await prisma.scheduledJob.findFirst({
          where: { campaignId: campaign.id },
        });
        if (existingJob) {
          await prisma.scheduledJob.update({
            where: { id: existingJob.id },
            data: {
              status: "FAILED",
              lastError: err?.message || "Dispatch error",
            },
          });
        } else {
          await prisma.scheduledJob.create({
            data: {
              campaignId: campaign.id,
              runAt: campaign.scheduledAt || now,
              status: "FAILED",
              retryCount: 0,
              maxRetries: 3,
              lastError: err?.message || "Dispatch error",
            },
          });
        }

        result.failedCampaigns.push(campaign.id);
      }
    }

    // 2. Process retry jobs with exponential backoff
    result.retriedJobsCount = await this.processPendingRetries(now);

    return result;
  }

  /**
   * Executes campaign message dispatch with:
   * - Recipient-level idempotency (never re-sends to contacts already SENT/DELIVERED/READ)
   * - Real-time consent and opt-out verification
   * - Cloud-safe timezone formatting (Asia/Kolkata default)
   * - Rate pacing and audit logging
   */
  public static async dispatchCampaign(
    campaignId: string,
    options?: { isMissedRun?: boolean; referenceNow?: Date }
  ): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: true,
        targetGroup: {
          include: {
            memberships: {
              include: {
                contact: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found.`);
    }

    if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
      throw new Error(`Cannot dispatch campaign ${campaignId}: Current status is ${campaign.status}.`);
    }

    // Load active suppression list (global phone opt-outs)
    const optOutRecords = await prisma.optOut.findMany({
      select: { phone: true },
    });
    const suppressedPhones = new Set(optOutRecords.map((o) => o.phone));

    // Load existing recipient records for this campaign to enforce idempotency on retry/recovery
    const existingRecipients = await prisma.campaignRecipient.findMany({
      where: { campaignId },
      include: { contact: true },
    });
    const existingRecipientByContactId = new Map(
      existingRecipients.map((r) => [r.contactId, r])
    );

    // Gather recipients: if targetGroup exists, use members; otherwise use existing campaign recipients
    let contactsToProcess: Array<any> = [];

    if (campaign.targetGroup) {
      contactsToProcess = campaign.targetGroup.memberships.map((m) => m.contact);
    } else {
      contactsToProcess = existingRecipients.map((r) => r.contact);
    }

    const userTimezone = campaign.user?.defaultTimezone || "Asia/Kolkata";
    let successCount = 0;
    let failedCount = 0;

    for (const contact of contactsToProcess) {
      // IDEMPOTENCY GUARD: If this contact was already SENT/DELIVERED/READ in a prior attempt,
      // count as succeeded and skip re-sending to guarantee zero duplicate messages!
      const priorRecord = existingRecipientByContactId.get(contact.id);
      if (
        priorRecord &&
        (priorRecord.status === "SENT" ||
          priorRecord.status === "DELIVERED" ||
          priorRecord.status === "READ")
      ) {
        successCount++;
        continue;
      }

      // CRITICAL PRIVACY CHECK:
      // Re-check consent and opt-out status immediately before sending
      const isPhoneSuppressed = suppressedPhones.has(contact.phone);
      const isContactOptedOut = contact.optOutStatus || isPhoneSuppressed;
      const hasConsent = contact.consentStatus === "GRANTED";

      // Build context for variable interpolation using user's configured timezone
      const context = {
        name: contact.name,
        phone: contact.phone,
        email: contact.email || "",
        role: contact.roleOrGrade || "",
        group: campaign.targetGroup?.name || "",
        due_date: new Date(Date.now() + 86400000 * 3).toLocaleDateString("en-IN", {
          timeZone: userTimezone,
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        fee_amount: "₹4,500",
        meeting_time: "10:30 AM",
      };

      const { rendered } = renderPersonalizedMessage(campaign.messageContent, context);

      if (isContactOptedOut || !hasConsent) {
        // Record as skipped recipient - DO NOT SEND
        const skipReason = isContactOptedOut
          ? "Contact has opted out or phone is on suppression list."
          : "Contact does not have GRANTED consent status.";

        await prisma.campaignRecipient.upsert({
          where: {
            campaignId_contactId: {
              campaignId: campaign.id,
              contactId: contact.id,
            },
          },
          create: {
            campaignId: campaign.id,
            contactId: contact.id,
            phoneSnapshot: contact.phone,
            nameSnapshot: contact.name,
            personalizedMessage: rendered,
            status: "OPTED_OUT_SKIPPED",
            errorMessage: skipReason,
            errorCode: isContactOptedOut ? "OPT_OUT_SUPPRESSED" : "NO_CONSENT",
          },
          update: {
            status: "OPTED_OUT_SKIPPED",
            errorMessage: skipReason,
            errorCode: isContactOptedOut ? "OPT_OUT_SUPPRESSED" : "NO_CONSENT",
          },
        });

        // Also log the privacy suppression event
        await prisma.messageLog.create({
          data: {
            campaignId: campaign.id,
            phone: contact.phone,
            direction: "OUTBOUND",
            status: "SUPPRESSED",
            payloadMasked: JSON.stringify({
              reason: skipReason,
              name: contact.name,
            }),
          },
        });

        continue;
      }

      // Contact is eligible and verified! Dispatch message via WhatsAppCloudAdapter (Simulation Mode by default)
      const sendResult = await WhatsAppCloudAdapter.sendMessage({
        toPhone: contact.phone,
        messageText: rendered,
      });

      if (sendResult.success) {
        successCount++;
        const sentTime = new Date();

        await prisma.campaignRecipient.upsert({
          where: {
            campaignId_contactId: {
              campaignId: campaign.id,
              contactId: contact.id,
            },
          },
          create: {
            campaignId: campaign.id,
            contactId: contact.id,
            phoneSnapshot: contact.phone,
            nameSnapshot: contact.name,
            personalizedMessage: rendered,
            status: "SENT",
            providerMessageId: sendResult.messageId,
            sentAt: sentTime,
          },
          update: {
            status: "SENT",
            providerMessageId: sendResult.messageId,
            sentAt: sentTime,
            errorMessage: null,
            errorCode: null,
          },
        });

        await prisma.messageLog.create({
          data: {
            campaignId: campaign.id,
            phone: contact.phone,
            direction: "OUTBOUND",
            status: "SENT",
            payloadMasked: JSON.stringify({
              to: contact.phone,
              textLength: rendered.length,
              isSimulated: sendResult.isSimulated,
            }),
            providerResponse: JSON.stringify(sendResult.rawResponse || {}),
          },
        });
      } else {
        failedCount++;
        await prisma.campaignRecipient.upsert({
          where: {
            campaignId_contactId: {
              campaignId: campaign.id,
              contactId: contact.id,
            },
          },
          create: {
            campaignId: campaign.id,
            contactId: contact.id,
            phoneSnapshot: contact.phone,
            nameSnapshot: contact.name,
            personalizedMessage: rendered,
            status: "FAILED",
            errorMessage: sendResult.errorMessage,
            errorCode: sendResult.errorCode,
          },
          update: {
            status: "FAILED",
            errorMessage: sendResult.errorMessage,
            errorCode: sendResult.errorCode,
          },
        });

        await prisma.messageLog.create({
          data: {
            campaignId: campaign.id,
            phone: contact.phone,
            direction: "OUTBOUND",
            status: "FAILED",
            payloadMasked: JSON.stringify({
              to: contact.phone,
              error: sendResult.errorMessage,
            }),
            providerResponse: JSON.stringify(sendResult.rawResponse || {}),
          },
        });
      }

      // Polite pacing to prevent hitting rate limits
      await new Promise((r) => setTimeout(r, 25));
    }

    const finalStatus =
      failedCount > 0 && successCount === 0
        ? "FAILED"
        : "COMPLETED";

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        totalRecipients: contactsToProcess.length,
        successfulCount: successCount,
        failedCount: failedCount,
      },
    });

    await recordAuditLog({
      userId: campaign.userId,
      action: "CAMPAIGN_DISPATCHED",
      entityType: "CAMPAIGN",
      entityId: campaign.id,
      details: {
        name: campaign.name,
        totalRecipients: contactsToProcess.length,
        successfulCount: successCount,
        failedCount: failedCount,
        finalStatus,
        missedRunRecovered: Boolean(options?.isMissedRun),
      },
    });
  }

  /**
   * Processes retry handling for jobs that encountered temporary faults
   * using exponential backoff (1m, 2m, 4m) up to maxRetries (3).
   */
  public static async processPendingRetries(now: Date = new Date()): Promise<number> {
    const failedJobs = await prisma.scheduledJob.findMany({
      where: {
        status: "FAILED",
        retryCount: {
          lt: 3,
        },
      },
      include: {
        campaign: true,
      },
      take: 5,
    });

    let retriedCount = 0;

    for (const job of failedJobs) {
      if (
        !job.campaign ||
        job.campaign.status === "COMPLETED" ||
        job.campaign.status === "CANCELLED"
      ) {
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", completedAt: now },
        });
        continue;
      }

      const backoffMs = Math.pow(2, job.retryCount) * 60000; // 1m, 2m, 4m
      const nextAttempt = new Date(job.updatedAt.getTime() + backoffMs);
      if (now >= nextAttempt) {
        retriedCount++;
        await prisma.scheduledJob.update({
          where: { id: job.id },
          data: {
            status: "RUNNING",
            retryCount: { increment: 1 },
            lockedAt: now,
          },
        });

        try {
          await this.dispatchCampaign(job.campaignId);
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              lastError: null,
            },
          });
        } catch (e: any) {
          await prisma.scheduledJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              lastError: e.message,
            },
          });
        }
      }
    }

    return retriedCount;
  }
}
