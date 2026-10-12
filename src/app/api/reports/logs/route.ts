import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const campaignId = searchParams.get("campaignId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { payloadMasked: { contains: search } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const [total, logs] = await Promise.all([
      prisma.messageLog.count({ where }),
      prisma.messageLog.findMany({
        where,
        include: {
          campaign: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Aggregate delivery stats across actual recipients
    const [sentCount, deliveredCount, readCount, failedCount, skippedCount] = await Promise.all([
      prisma.campaignRecipient.count({ where: { status: "SENT" } }),
      prisma.campaignRecipient.count({ where: { status: "DELIVERED" } }),
      prisma.campaignRecipient.count({ where: { status: "READ" } }),
      prisma.campaignRecipient.count({ where: { status: "FAILED" } }),
      prisma.campaignRecipient.count({ where: { status: "OPTED_OUT_SKIPPED" } }),
    ]);

    return NextResponse.json({
      logs,
      metrics: {
        sent: sentCount,
        delivered: deliveredCount,
        read: readCount,
        failed: failedCount,
        optedOutSkipped: skippedCount,
      },
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
