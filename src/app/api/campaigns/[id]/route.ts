import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        targetGroup: true,
        recipients: {
          orderBy: { createdAt: "asc" },
        },
        messageLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst();
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Delete associated scheduled jobs first
    await prisma.scheduledJob.deleteMany({
      where: { campaignId: params.id },
    });

    await prisma.campaign.delete({
      where: { id: params.id },
    });

    await recordAuditLog({
      userId: user?.id,
      action: "CAMPAIGN_DELETED",
      entityType: "CAMPAIGN",
      entityId: params.id,
      details: { name: campaign.name },
    });

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
