import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    // 1. Contact counts
    const totalContacts = await prisma.contact.count({
      where: { userId: user.id },
    });

    const consentingContacts = await prisma.contact.count({
      where: { userId: user.id, consentStatus: "GRANTED", optOutStatus: false },
    });

    const optedOutContacts = await prisma.contact.count({
      where: { userId: user.id, optOutStatus: true },
    });

    // 2. Group count
    const totalGroups = await prisma.group.count({
      where: { userId: user.id },
    });

    // 3. Campaign counts by status
    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        successfulCount: true,
        failedCount: true,
      },
    });

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      SCHEDULED: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    campaigns.forEach((c) => {
      if (statusCounts[c.status] !== undefined) {
        statusCounts[c.status]++;
      }
    });

    // Aggregate delivery stats across executed recipient dispatches
    const [sentRecipients, deliveredRecipients, readRecipients, failedRecipients] = await Promise.all([
      prisma.campaignRecipient.count({
        where: {
          campaign: { userId: user.id },
          status: "SENT",
        },
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { userId: user.id },
          status: "DELIVERED",
        },
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { userId: user.id },
          status: "READ",
        },
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { userId: user.id },
          status: "FAILED",
        },
      }),
    ]);

    const successfulDispatches = sentRecipients + deliveredRecipients + readRecipients;
    const failedDispatches = failedRecipients;
    const totalDispatches = successfulDispatches + failedDispatches;

    const deliverySuccessRate =
      totalDispatches > 0
        ? Math.round((successfulDispatches / totalDispatches) * 100)
        : 100;

    // 4. Upcoming scheduled campaigns
    const upcomingCampaigns = await prisma.campaign.findMany({
      where: {
        userId: user.id,
        status: "SCHEDULED",
      },
      include: {
        targetGroup: {
          select: { name: true, color: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });

    // 5. Recent completed or active campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      include: {
        targetGroup: {
          select: { name: true, color: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // 6. Recent audit logs
    const recentActivity = await prisma.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    return NextResponse.json({
      stats: {
        totalContacts,
        consentingContacts,
        optedOutContacts,
        totalGroups,
        totalCampaigns: campaigns.length,
        statusCounts,
        totalDispatches,
        successfulDispatches,
        failedDispatches,
        deliverySuccessRate,
      },
      upcomingCampaigns,
      recentCampaigns,
      recentActivity,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve dashboard metrics", details: error.message },
      { status: 500 }
    );
  }
}
