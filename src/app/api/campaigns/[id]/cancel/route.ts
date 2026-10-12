import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function POST(
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

    if (campaign.status === "COMPLETED" || campaign.status === "PROCESSING") {
      return NextResponse.json(
        { error: `Cannot cancel campaign with status ${campaign.status}` },
        { status: 400 }
      );
    }

    await prisma.campaign.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });

    await prisma.scheduledJob.updateMany({
      where: { campaignId: params.id },
      data: { status: "FAILED", lastError: "Campaign was cancelled by user." },
    });

    await recordAuditLog({
      userId: user?.id,
      action: "CAMPAIGN_CANCELLED",
      entityType: "CAMPAIGN",
      entityId: campaign.id,
      details: { name: campaign.name },
    });

    return NextResponse.json({ success: true, message: "Campaign cancelled successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
