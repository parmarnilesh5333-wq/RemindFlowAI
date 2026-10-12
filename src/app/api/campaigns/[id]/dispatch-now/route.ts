import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SchedulerService } from "@/lib/scheduler-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const ALLOWED_DISPATCH_STATUSES = ["SCHEDULED", "DRAFT"];
    if (!ALLOWED_DISPATCH_STATUSES.includes(campaign.status)) {
      let message = `Cannot dispatch campaign with status "${campaign.status}". Only SCHEDULED or DRAFT campaigns can be dispatched.`;
      if (campaign.status === "PROCESSING") {
        message = "Campaign is already being processed or dispatched.";
      } else if (campaign.status === "COMPLETED") {
        message = "Cannot dispatch campaign: Campaign has already completed.";
      } else if (campaign.status === "CANCELLED") {
        message = "Cannot dispatch campaign: Campaign has been cancelled.";
      } else if (campaign.status === "FAILED") {
        message = "Cannot dispatch campaign: Campaign has failed.";
      }
      return NextResponse.json(
        { error: message, currentStatus: campaign.status },
        { status: 400 }
      );
    }

    // Set status to PROCESSING
    await prisma.campaign.update({
      where: { id: params.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    // Execute dispatch
    await SchedulerService.dispatchCampaign(params.id);

    const updated = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        recipients: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Campaign dispatched successfully.",
      campaign: updated,
    });
  } catch (error: any) {
    console.error("Dispatch now error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
