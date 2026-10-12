import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const groups = await prisma.group.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      groups: groups.map((g) => ({
        ...g,
        memberCount: g._count.memberships,
      })),
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
    const { name, description, color = "#FB7185" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Group name is required." }, { status: 400 });
    }

    const existing = await prisma.group.findFirst({
      where: {
        userId: user.id,
        name: name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Group with name "${name}" already exists.` },
        { status: 409 }
      );
    }

    const group = await prisma.group.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description ? description.trim() : null,
        color,
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "GROUP_CREATED",
      entityType: "GROUP",
      entityId: group.id,
      details: { name: group.name },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
