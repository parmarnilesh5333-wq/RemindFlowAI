import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const original = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!original) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const duplicated = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: `Copy of ${original.name}`,
        objective: original.objective,
        targetGroupId: original.targetGroupId,
        status: "DRAFT",
        language: original.language,
        originalPrompt: original.originalPrompt,
        messageContent: original.messageContent,
        variablesUsed: original.variablesUsed,
        totalRecipients: original.totalRecipients,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "CAMPAIGN_DUPLICATED",
      entityType: "CAMPAIGN",
      entityId: duplicated.id,
      details: { originalId: original.id, newName: duplicated.name },
    });

    return NextResponse.json({ campaign: duplicated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
