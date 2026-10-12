import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateTemplate } from "@/lib/template";
import { SchedulerService } from "@/lib/scheduler-service";
import { recordAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const where: any = {
      userId: user.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { messageContent: { contains: search } },
        { objective: { contains: search } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const [total, campaigns] = await Promise.all([
      prisma.campaign.count({ where }),
      prisma.campaign.findMany({
        where,
        include: {
          targetGroup: {
            select: { id: true, name: true, color: true },
          },
          _count: {
            select: { recipients: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      objective,
      targetGroupId,
      messageContent,
      language = "en",
      scheduledAt,
      sendImmediately = false,
      originalPrompt,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
    }

    const templateValidation = validateTemplate(messageContent);
    if (!templateValidation.isValid) {
      return NextResponse.json(
        { error: templateValidation.errors.join(" ") },
        { status: 400 }
      );
    }

    if (!targetGroupId) {
      return NextResponse.json({ error: "Target recipient group is required." }, { status: 400 });
    }

    // Verify group exists and fetch its contacts
    const group = await prisma.group.findUnique({
      where: { id: targetGroupId },
      include: {
        memberships: {
          include: { contact: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Selected group does not exist." }, { status: 404 });
    }

    if (group.memberships.length === 0) {
      return NextResponse.json(
        { error: `Group "${group.name}" currently has 0 contacts. Add contacts to this group before launching a campaign.` },
        { status: 400 }
      );
    }

    // Duplicate detection hash (hash of targetGroup + message + approx date)
    const scheduledDateParsed = scheduledAt ? new Date(scheduledAt) : new Date();
    const dateKey = sendImmediately ? "IMMEDIATE" : scheduledDateParsed.toISOString().slice(0, 13); // hour precision
    const duplicateHash = `${targetGroupId}_${dateKey}_${messageContent.trim().slice(0, 50)}`;

    const recentDuplicate = await prisma.campaign.findFirst({
      where: {
        userId: user.id,
        duplicateHash,
        status: { in: ["SCHEDULED", "PROCESSING", "COMPLETED"] },
      },
    });

    if (recentDuplicate) {
      return NextResponse.json(
        {
          error: `A duplicate campaign ("${recentDuplicate.name}") is already scheduled/sent for this audience group around this time.`,
          duplicateCampaignId: recentDuplicate.id,
        },
        { status: 409 }
      );
    }

    const initialStatus = sendImmediately ? "PROCESSING" : "SCHEDULED";

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: name.trim(),
        objective: objective ? objective.trim() : null,
        targetGroupId,
        status: initialStatus,
        language,
        originalPrompt: originalPrompt || null,
        messageContent,
        variablesUsed: JSON.stringify(templateValidation.variables),
        scheduledAt: sendImmediately ? new Date() : scheduledDateParsed,
        totalRecipients: group.memberships.length,
        duplicateHash,
      },
    });

    // Create ScheduledJob if scheduled for future
    if (!sendImmediately) {
      await prisma.scheduledJob.create({
        data: {
          campaignId: campaign.id,
          runAt: scheduledDateParsed,
          status: "PENDING",
        },
      });
    }

    await recordAuditLog({
      userId: user.id,
      action: sendImmediately ? "CAMPAIGN_LAUNCHED_IMMEDIATE" : "CAMPAIGN_SCHEDULED",
      entityType: "CAMPAIGN",
      entityId: campaign.id,
      details: {
        name: campaign.name,
        targetGroup: group.name,
        recipientsCount: group.memberships.length,
        scheduledAt: campaign.scheduledAt,
      },
    });

    // If immediate send was requested, dispatch right away
    if (sendImmediately) {
      try {
        await SchedulerService.dispatchCampaign(campaign.id);
      } catch (dispatchErr: any) {
        console.error("Immediate dispatch error:", dispatchErr);
      }
    }

    const reloaded = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: {
        targetGroup: true,
        _count: { select: { recipients: true } },
      },
    });

    return NextResponse.json({ campaign: reloaded }, { status: 201 });
  } catch (error: any) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
